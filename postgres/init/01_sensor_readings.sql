CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS sensor_readings (
    sensor_id     text        NOT NULL,
    building_name text        NOT NULL,
    room_number   text        NOT NULL,
    ts            timestamptz NOT NULL,
    co2           integer,
    temperature   integer,
    humidity      integer,
    PRIMARY KEY (sensor_id, ts)
);

SELECT create_hypertable('sensor_readings', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS sensor_readings_room_ts_idx
    ON sensor_readings (building_name, room_number, ts DESC);

CREATE INDEX IF NOT EXISTS sensor_readings_ts_idx
    ON sensor_readings (ts DESC);