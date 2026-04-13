CREATE TABLE IF NOT EXISTS sensors (
    id BIGSERIAL PRIMARY KEY,
    sensor_id TEXT NOT NULL,
    building_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    co2 INTEGER NOT NULL DEFAULT 0,
    temperature INTEGER NOT NULL DEFAULT 0,
    humidity INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sensors_room_ts
    ON sensors (room_number, ts DESC);

CREATE INDEX IF NOT EXISTS idx_sensors_building_room
    ON sensors (building_name, room_number);

CREATE INDEX IF NOT EXISTS idx_sensors_sensor_ts
    ON sensors (sensor_id, ts DESC);