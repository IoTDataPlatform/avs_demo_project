import json
import os
import random
import signal
import ssl
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import paho.mqtt.client as mqtt


def env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "y", "on"}


MQTT_QOS = int(os.getenv("MQTT_QOS", "1"))
MQTT_TOPIC_TEMPLATE = os.getenv("MQTT_TOPIC_TEMPLATE", "sensors/room{roomNumber}/data")
MQTT_KEEPALIVE = int(os.getenv("MQTT_KEEPALIVE", "60"))

MQTT_USERNAME = os.getenv("MQTT_USERNAME", "").strip()
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")
MQTT_TLS_ENABLED = env_bool("MQTT_TLS_ENABLED", "false")
MQTT_TLS_INSECURE = env_bool("MQTT_TLS_INSECURE", "false")
MQTT_TLS_CA_CERTS = os.getenv("MQTT_TLS_CA_CERTS", "").strip()

REALTIME_MQTT_HOST = os.getenv("REALTIME_MQTT_HOST", "localhost")
REALTIME_MQTT_PORT = int(os.getenv("REALTIME_MQTT_PORT", "1883"))
REALTIME_MQTT_CLIENT_ID = os.getenv("REALTIME_MQTT_CLIENT_ID", "avs-emulator-realtime")

BACKFILL_MQTT_HOST = os.getenv("BACKFILL_MQTT_HOST", REALTIME_MQTT_HOST)
BACKFILL_MQTT_PORT = int(os.getenv("BACKFILL_MQTT_PORT", str(REALTIME_MQTT_PORT)))
BACKFILL_MQTT_CLIENT_ID = os.getenv("BACKFILL_MQTT_CLIENT_ID", "avs-emulator-backfill")

SLEEP_AFTER_BACKFILL = int(os.getenv("SLEEP_AFTER_BACKFILL", "10"))

SENSOR_MAP_FILE = os.getenv("SENSOR_MAP_FILE", "/app/sensor_map.txt")
SENSOR_COUNT = int(os.getenv("SENSOR_COUNT", "1"))
SENSOR_SELECTION = os.getenv("SENSOR_SELECTION", "first").lower()
SENSOR_IDS = os.getenv("SENSOR_IDS", "").strip()

BACKFILL_ENABLED = env_bool("BACKFILL_ENABLED", "false")
BACKFILL_FROM_YEAR = int(os.getenv("BACKFILL_FROM_YEAR", "2021"))
BACKFILL_INTERVAL_SEC = int(os.getenv("BACKFILL_INTERVAL_SEC", "3600"))

REALTIME_INTERVAL_SEC = float(os.getenv("REALTIME_INTERVAL_SEC", "10"))

TEMPERATURE_BASE = float(os.getenv("TEMPERATURE_BASE", "23"))
HUMIDITY_BASE = float(os.getenv("HUMIDITY_BASE", "45"))
CO2_BASE = float(os.getenv("CO2_BASE", "650"))

TEMPERATURE_JITTER = float(os.getenv("TEMPERATURE_JITTER", "1.5"))
HUMIDITY_JITTER = float(os.getenv("HUMIDITY_JITTER", "7"))
CO2_JITTER = float(os.getenv("CO2_JITTER", "80"))

RUNNING = True

BUILDING_NAME_MAP = {
    "Аудиторный корпус": "Auditory",
    "Главный корпус": "Main",
    "Учебно-лабораторный корпус": "Educational_Laboratory",
    "Учебный корпус №1": "Educational_1",
    "Ректорат": "Rectorate",
    "Auditory": "Auditory",
    "Main": "Main",
    "Educational_Laboratory": "Educational_Laboratory",
    "Educational_1": "Educational_1",
    "Rectorate": "Rectorate",
}


@dataclass(frozen=True)
class Device:
    sensor_id: str
    room_number: str
    building_name: str
    base_temperature: float
    base_humidity: float
    base_co2: float


def handle_shutdown(signum, frame) -> None:
    global RUNNING
    print(f"[shutdown] received signal={signum}")
    RUNNING = False


def setup_signal_handlers() -> None:
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)


def to_iso_z(dt: datetime) -> str:
    return (
        dt.astimezone(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def stable_seed(sensor_id: str) -> int:
    return sum((i + 1) * ord(ch) for i, ch in enumerate(sensor_id))


def sensor_offset(sensor_id: str, low: float, high: float) -> float:
    rng = random.Random(stable_seed(sensor_id))
    return rng.uniform(low, high)


def topic_for(device: Device) -> str:
    return MQTT_TOPIC_TEMPLATE.format(
        roomNumber=device.room_number,
        sensorId=device.sensor_id,
        buildingName=device.building_name,
    )


def load_devices_from_map(path: str) -> list[Device]:
    devices: list[Device] = []

    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()

            if not line or line.startswith("#"):
                continue
            if "|" not in line:
                continue
            if line.lower().startswith("sensor id"):
                continue

            parts = [p.strip() for p in line.split("|")]
            if len(parts) != 3:
                continue

            sensor_id, room_number, building_raw = parts
            building_name = BUILDING_NAME_MAP.get(building_raw)

            if not building_name:
                raise ValueError(
                    f"Unknown building name '{building_raw}' in mapping file {path}"
                )

            devices.append(
                Device(
                    sensor_id=sensor_id,
                    room_number=room_number,
                    building_name=building_name,
                    base_temperature=TEMPERATURE_BASE + sensor_offset(sensor_id, -2.0, 2.0),
                    base_humidity=HUMIDITY_BASE + sensor_offset(sensor_id, -8.0, 8.0),
                    base_co2=CO2_BASE + sensor_offset(sensor_id, -120.0, 120.0),
                )
            )

    if not devices:
        raise ValueError(f"No devices loaded from mapping file: {path}")

    return devices


def select_devices(devices: list[Device]) -> list[Device]:
    by_id = {d.sensor_id: d for d in devices}

    if SENSOR_IDS:
        requested_ids = [x.strip() for x in SENSOR_IDS.split(",") if x.strip()]
        selected = []

        for sensor_id in requested_ids:
            if sensor_id not in by_id:
                raise ValueError(f"Sensor '{sensor_id}' not found in mapping file")
            selected.append(by_id[sensor_id])

        return selected

    if SENSOR_COUNT < 1:
        raise ValueError("SENSOR_COUNT must be > 0")
    if SENSOR_COUNT > len(devices):
        raise ValueError(
            f"SENSOR_COUNT={SENSOR_COUNT} is greater than available devices={len(devices)}"
        )

    if SENSOR_SELECTION == "random":
        rng = random.Random(42)
        return rng.sample(devices, SENSOR_COUNT)

    if SENSOR_SELECTION != "first":
        raise ValueError("SENSOR_SELECTION must be 'first' or 'random'")

    return devices[:SENSOR_COUNT]


def generate_payload(device: Device, ts: datetime | None = None) -> dict:
    if ts is None:
        ts = datetime.now(timezone.utc)

    temperature = round(
        clamp(
            device.base_temperature + random.uniform(-TEMPERATURE_JITTER, TEMPERATURE_JITTER),
            0,
            35,
            )
    )
    humidity = round(
        clamp(
            device.base_humidity + random.uniform(-HUMIDITY_JITTER, HUMIDITY_JITTER),
            15,
            90,
            )
    )
    co2 = round(
        clamp(
            device.base_co2 + random.uniform(-CO2_JITTER, CO2_JITTER),
            350,
            2000,
            )
    )

    return {
        "sensorId": device.sensor_id,
        "buildingName": device.building_name,
        "roomNumber": device.room_number,
        "ts": to_iso_z(ts),
        "co2": co2,
        "temperature": temperature,
        "humidity": humidity,
    }


def configure_auth_and_tls(client: mqtt.Client) -> None:
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    if not MQTT_TLS_ENABLED:
        return

    if MQTT_TLS_INSECURE:
        context = ssl._create_unverified_context()
    else:
        cafile = MQTT_TLS_CA_CERTS or None
        if cafile and not os.path.exists(cafile):
            raise FileNotFoundError(
                f"MQTT_TLS_CA_CERTS points to missing file: {cafile}. "
                "Install ca-certificates in the image or unset MQTT_TLS_CA_CERTS."
            )
        context = ssl.create_default_context(cafile=cafile)
        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED

    client.tls_set_context(context)
    client.tls_insecure_set(MQTT_TLS_INSECURE)


def create_client(client_id: str) -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=client_id,
    )

    configure_auth_and_tls(client)

    def on_connect(c, userdata, flags, reason_code, properties=None):
        print(f"[connect] connected, reason_code={reason_code}")
        if reason_code == 0:
            print(f"[connect] client_id={client_id}")

    def on_disconnect(c, userdata, disconnect_flags, reason_code, properties=None):
        print(f"[disconnect] client_id={client_id} reason_code={reason_code}")

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.reconnect_delay_set(min_delay=1, max_delay=5)
    return client


def connect_with_retry(client: mqtt.Client, host: str, port: int) -> None:
    while RUNNING:
        try:
            print(f"[connect] trying {host}:{port} tls={MQTT_TLS_ENABLED} username_set={bool(MQTT_USERNAME)}")
            client.connect(host, port, keepalive=MQTT_KEEPALIVE)
            return
        except Exception as exc:
            print(f"[connect] failed: {type(exc).__name__}: {exc}")
            time.sleep(2)


def publish_payload(client: mqtt.Client, device: Device, payload: dict) -> None:
    topic = topic_for(device)
    payload_json = json.dumps(payload, ensure_ascii=False)

    info = client.publish(topic, payload_json, qos=MQTT_QOS)
    info.wait_for_publish()

    if info.rc != mqtt.MQTT_ERR_SUCCESS:
        print(f"[publish] failed topic={topic} payload={payload_json} rc={info.rc}")
    else:
        print(f"[publish] topic={topic} payload={payload_json}")

def run_with_client(host: str, port: int, client_id: str, runner) -> None:
    client = create_client(client_id)
    connect_with_retry(client, host, port)
    client.loop_start()
    try:
        runner(client)
    finally:
        client.loop_stop()
        client.disconnect()

def run_backfill(client: mqtt.Client, devices: list[Device]) -> None:
    if not BACKFILL_ENABLED:
        return

    start_ts = datetime(BACKFILL_FROM_YEAR, 1, 1, tzinfo=timezone.utc)
    end_ts = datetime.now(timezone.utc)

    print(
        f"[backfill] from={to_iso_z(start_ts)} "
        f"to={to_iso_z(end_ts)} "
        f"step_sec={BACKFILL_INTERVAL_SEC}"
    )

    current = start_ts

    while RUNNING and current <= end_ts:
        for device in devices:
            payload = generate_payload(device, current)
            publish_payload(client, device, payload)

        current += timedelta(seconds=BACKFILL_INTERVAL_SEC)

    print("[backfill] finished")


def run_realtime(client: mqtt.Client, devices: list[Device]) -> None:
    print(f"[realtime] interval_sec={REALTIME_INTERVAL_SEC}")
    print(f"[realtime] selected_devices={[d.sensor_id for d in devices]}")

    while RUNNING:
        ts = datetime.now(timezone.utc)

        for device in devices:
            payload = generate_payload(device, ts)
            publish_payload(client, device, payload)

        time.sleep(REALTIME_INTERVAL_SEC)

    print("[realtime] stopped")


def main() -> None:
    if MQTT_QOS not in (0, 1, 2):
        raise ValueError("MQTT_QOS must be 0, 1 or 2")
    if MQTT_KEEPALIVE < 1:
        raise ValueError("MQTT_KEEPALIVE must be > 0")
    if BACKFILL_INTERVAL_SEC < 1:
        raise ValueError("BACKFILL_INTERVAL_SEC must be > 0")
    if REALTIME_INTERVAL_SEC <= 0:
        raise ValueError("REALTIME_INTERVAL_SEC must be > 0")

    setup_signal_handlers()

    all_devices = load_devices_from_map(SENSOR_MAP_FILE)
    devices = select_devices(all_devices)

    print("[config] realtime_mqtt_host=", REALTIME_MQTT_HOST)
    print("[config] realtime_mqtt_port=", REALTIME_MQTT_PORT)
    print("[config] backfill_mqtt_host=", BACKFILL_MQTT_HOST)
    print("[config] backfill_mqtt_port=", BACKFILL_MQTT_PORT)
    print("[config] mqtt_qos=", MQTT_QOS)
    print("[config] mqtt_keepalive=", MQTT_KEEPALIVE)
    print("[config] mqtt_username_set=", bool(MQTT_USERNAME))
    print("[config] mqtt_tls_enabled=", MQTT_TLS_ENABLED)
    print("[config] mqtt_tls_insecure=", MQTT_TLS_INSECURE)
    print("[config] mqtt_tls_ca_certs=", MQTT_TLS_CA_CERTS or "<system-default>")
    print("[config] sensor_map_file=", SENSOR_MAP_FILE)
    print("[config] total_devices_in_map=", len(all_devices))
    print("[config] selected_sensor_ids=", [d.sensor_id for d in devices])
    print("[config] backfill_enabled=", BACKFILL_ENABLED)
    print("[config] realtime_interval_sec=", REALTIME_INTERVAL_SEC)

    if BACKFILL_ENABLED and RUNNING:
        run_with_client(
            BACKFILL_MQTT_HOST,
            BACKFILL_MQTT_PORT,
            BACKFILL_MQTT_CLIENT_ID,
            lambda client: run_backfill(client, devices),
        )
        time.sleep(SLEEP_AFTER_BACKFILL)

    if RUNNING:
        run_with_client(
            REALTIME_MQTT_HOST,
            REALTIME_MQTT_PORT,
            REALTIME_MQTT_CLIENT_ID,
            lambda client: run_realtime(client, devices),
        )


if __name__ == "__main__":
    main()