import json
import os
import random
import signal
import sys
import time
from datetime import datetime, timezone, timedelta

import paho.mqtt.client as mqtt


MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "avs/sensors/readings")

DEVICE_COUNT = int(os.getenv("DEVICE_COUNT", "100"))
DEVICE_PREFIX = os.getenv("DEVICE_PREFIX", "sensor_")

BACKFILL_ENABLED = os.getenv("BACKFILL_ENABLED", "false").lower() == "true"
BACKFILL_FROM_YEAR = int(os.getenv("BACKFILL_FROM_YEAR", "2021"))
BACKFILL_INTERVAL_SEC = int(os.getenv("BACKFILL_INTERVAL_SEC", "3600"))

REALTIME_INTERVAL_SEC = float(os.getenv("REALTIME_INTERVAL_SEC", "1"))

RUNNING = True

BUILDINGS = [
    "Главный корпус",
    "Лекционный",
    "Новый",
    "Корпус поточных аудиторий",
]

BUILDING_ROOM_RANGES = {
    "Главный корпус": (100, 399),
    "Лекционный": (100, 299),
    "Новый": (200, 499),
    "Корпус поточных аудиторий": (1, 80),
}


def handle_shutdown(signum, frame):
    global RUNNING
    print(f"Received signal {signum}, shutting down...")
    RUNNING = False


signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)


def to_iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def clamp(value, low, high):
    return max(low, min(high, value))


def random_room_for_building(building_name: str) -> str:
    room_min, room_max = BUILDING_ROOM_RANGES[building_name]
    return str(random.randint(room_min, room_max))


def build_device_catalog(count: int):
    devices = []

    for i in range(1, count + 1):
        building_name = random.choice(BUILDINGS)
        room_number = random_room_for_building(building_name)

        devices.append(
            {
                "sensorId": f"{DEVICE_PREFIX}{i}",
                "buildingName": building_name,
                "roomNumber": room_number,
                "base_temperature": random.uniform(20.0, 25.0),
                "base_humidity": random.uniform(35.0, 60.0),
                "base_co2": random.uniform(420, 650),
            }
        )

    return devices


DEVICES = build_device_catalog(DEVICE_COUNT)


def generate_payload(device: dict, ts: datetime | None = None) -> dict:
    if ts is None:
        ts = datetime.now(timezone.utc)

    temperature = round(clamp(device["base_temperature"] + random.uniform(-1.5, 1.5), 16, 32))
    humidity = round(clamp(device["base_humidity"] + random.uniform(-10, 10), 15, 90))
    co2 = round(clamp(device["base_co2"] + random.uniform(-80, 120), 350, 2000))

    return {
        "sensorId": device["sensorId"],
        "buildingName": device["buildingName"],
        "roomNumber": device["roomNumber"],
        "ts": to_iso_z(ts),
        "co2": co2,
        "temperature": temperature,
        "humidity": humidity,
    }


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
        print(f"Publishing to topic: {MQTT_TOPIC}")
    else:
        print(f"Failed to connect to MQTT broker, rc={rc}")


def wait_for_broker(client: mqtt.Client, retries: int = 30, delay_sec: int = 2):
    for attempt in range(1, retries + 1):
        try:
            print(f"Connecting to MQTT broker (attempt {attempt}/{retries})...")
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            return
        except Exception as e:
            print(f"Connection attempt failed: {e}")
            time.sleep(delay_sec)

    print("Could not connect to MQTT broker after multiple attempts.")
    sys.exit(1)


def publish_payload(client: mqtt.Client, payload: dict):
    message = json.dumps(payload, ensure_ascii=False)
    result = client.publish(MQTT_TOPIC, message)
    result.wait_for_publish()

    if result.rc != mqtt.MQTT_ERR_SUCCESS:
        print(f"Publish failed for payload: {message}")
    else:
        print(message)


def run_backfill(client: mqtt.Client):
    if not BACKFILL_ENABLED:
        return

    start_ts = datetime(BACKFILL_FROM_YEAR, 1, 1, tzinfo=timezone.utc)
    end_ts = datetime.now(timezone.utc)

    print(
        f"Starting backfill from {to_iso_z(start_ts)} "
        f"to {to_iso_z(end_ts)} with step {BACKFILL_INTERVAL_SEC} sec"
    )

    current = start_ts
    while RUNNING and current <= end_ts:
        for device in DEVICES:
            payload = generate_payload(device, current)
            publish_payload(client, payload)
        current += timedelta(seconds=BACKFILL_INTERVAL_SEC)

    print("Backfill finished")


def run_realtime(client: mqtt.Client):
    print(f"Starting realtime emulation, interval={REALTIME_INTERVAL_SEC} sec")

    while RUNNING:
        ts = datetime.now(timezone.utc)
        for device in DEVICES:
            payload = generate_payload(device, ts)
            publish_payload(client, payload)

        time.sleep(REALTIME_INTERVAL_SEC)

    print("Realtime emulation stopped")


def main():
    print("Configured buildings:")
    for building in BUILDINGS:
        print(f" - {building}")

    print(f"Total devices: {DEVICE_COUNT}")

    client = mqtt.Client()
    client.on_connect = on_connect

    wait_for_broker(client)
    client.loop_start()

    try:
        run_backfill(client)
        run_realtime(client)
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()