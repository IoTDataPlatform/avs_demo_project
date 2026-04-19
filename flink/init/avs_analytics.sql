SET
'execution.checkpointing.interval' = '50 s';

CREATE TABLE avs_source_raw
(
    sensorId     STRING,
    buildingName STRING,
    roomNumber   STRING,
    ts           TIMESTAMP(3),
    co2          BIGINT,
    temperature  BIGINT,
    humidity     BIGINT,
    WATERMARK FOR ts AS ts - INTERVAL '5' SECOND
) WITH (
      'connector' = 'kafka',
      'topic' = 'avs-source',
      'properties.bootstrap.servers' = 'kafka:9092',
      'properties.group.id' = 'flink-avs',
      'scan.startup.mode' = 'latest-offset',
      'format' = 'avro-confluent',
      'avro-confluent.url' = 'http://kafka-schema-registry:8081'
      );

CREATE VIEW sensor_events_base AS
SELECT sensorId                              AS sensor_id,
       buildingName                          AS building_name,
       roomNumber                            AS room_number,
       CONCAT(buildingName, '|', roomNumber) AS room_key,
       ts,
       co2,
       temperature,
       humidity
FROM avs_source_raw
WHERE sensorId IS NOT NULL
  AND buildingName IS NOT NULL
  AND roomNumber IS NOT NULL
  AND ts IS NOT NULL
  AND co2 IS NOT NULL
  AND temperature IS NOT NULL
  AND humidity IS NOT NULL;

CREATE TABLE sensor_latest_sink
(
    sensor_id         STRING       NOT NULL,
    building_name     STRING       NOT NULL,
    room_number       STRING       NOT NULL,
    room_key          STRING       NOT NULL,
    ts                TIMESTAMP(3) NOT NULL,
    co2               BIGINT       NOT NULL,
    temperature       BIGINT       NOT NULL,
    humidity          BIGINT       NOT NULL,
    co2_state         STRING       NOT NULL,
    temperature_state STRING       NOT NULL,
    humidity_state    STRING       NOT NULL,
    overall_air_state STRING       NOT NULL,
    PRIMARY KEY (sensor_id) NOT ENFORCED
) WITH (
      'connector' = 'upsert-kafka',
      'topic' = 'avs-sensor-latest',
      'properties.bootstrap.servers' = 'kafka:9092',
      'key.format' = 'raw',
      'value.format' = 'avro-confluent',
      'value.avro-confluent.url' = 'http://kafka-schema-registry:8081'
      );

CREATE TABLE room_latest_sink
(
    room_key          STRING       NOT NULL,
    building_name     STRING       NOT NULL,
    room_number       STRING       NOT NULL,
    sensor_id         STRING       NOT NULL,
    ts                TIMESTAMP(3) NOT NULL,
    co2               BIGINT       NOT NULL,
    temperature       BIGINT       NOT NULL,
    humidity          BIGINT       NOT NULL,
    co2_state         STRING       NOT NULL,
    temperature_state STRING       NOT NULL,
    humidity_state    STRING       NOT NULL,
    overall_air_state STRING       NOT NULL,
    PRIMARY KEY (room_key) NOT ENFORCED
) WITH (
      'connector' = 'upsert-kafka',
      'topic' = 'avs-room-latest',
      'properties.bootstrap.servers' = 'kafka:9092',
      'key.format' = 'raw',
      'value.format' = 'avro-confluent',
      'value.avro-confluent.url' = 'http://kafka-schema-registry:8081'
      );

CREATE TABLE room_avg_1m_sink
(
    room_key          STRING       NOT NULL,
    building_name     STRING       NOT NULL,
    room_number       STRING       NOT NULL,
    window_start      TIMESTAMP(3) NOT NULL,
    window_end        TIMESTAMP(3) NOT NULL,
    co2_avg DOUBLE NOT NULL,
    temperature_avg DOUBLE NOT NULL,
    humidity_avg DOUBLE NOT NULL,
    co2_state         STRING       NOT NULL,
    temperature_state STRING       NOT NULL,
    humidity_state    STRING       NOT NULL,
    overall_air_state STRING       NOT NULL,
    PRIMARY KEY (room_key) NOT ENFORCED
) WITH (
      'connector' = 'upsert-kafka',
      'topic' = 'avs-room-avg-1m',
      'properties.bootstrap.servers' = 'kafka:9092',
      'key.format' = 'raw',
      'value.format' = 'avro-confluent',
      'value.avro-confluent.url' = 'http://kafka-schema-registry:8081'
      );

CREATE TABLE room_avg_1h_sink
    WITH (
        'connector' = 'upsert-kafka',
        'topic' = 'avs-room-avg-1h',
        'properties.bootstrap.servers' = 'kafka:9092',
        'key.format' = 'raw',
        'value.format' = 'avro-confluent',
        'value.avro-confluent.url' = 'http://kafka-schema-registry:8081'
        )
    LIKE room_avg_1m_sink
(
    EXCLUDING
    OPTIONS
);

CREATE TABLE room_avg_1d_sink
    WITH (
        'connector' = 'upsert-kafka',
        'topic' = 'avs-room-avg-1d',
        'properties.bootstrap.servers' = 'kafka:9092',
        'key.format' = 'raw',
        'value.format' = 'avro-confluent',
        'value.avro-confluent.url' = 'http://kafka-schema-registry:8081'
        )
    LIKE room_avg_1m_sink
(
    EXCLUDING
    OPTIONS
);

CREATE TABLE global_summary_sink
(
    summary_key                      STRING       NOT NULL,
    updated_at                       TIMESTAMP(3) NOT NULL,
    total_sensors_seen               BIGINT       NOT NULL,
    online_sensors_count             BIGINT       NOT NULL,
    online_sensor_ids_csv            STRING,
    rooms_co2_warning_count          BIGINT       NOT NULL,
    rooms_co2_critical_count         BIGINT       NOT NULL,
    rooms_temperature_warning_count  BIGINT       NOT NULL,
    rooms_temperature_critical_count BIGINT       NOT NULL,
    rooms_humidity_warning_count     BIGINT       NOT NULL,
    rooms_humidity_critical_count    BIGINT       NOT NULL,
    PRIMARY KEY (summary_key) NOT ENFORCED
) WITH (
      'connector' = 'upsert-kafka',
      'topic' = 'avs-global-summary',
      'properties.bootstrap.servers' = 'kafka:9092',
      'key.format' = 'raw',
      'value.format' = 'avro-confluent',
      'value.avro-confluent.url' = 'http://kafka-schema-registry:8081'
      );

CREATE VIEW sensor_events_scored AS
SELECT sensor_id,
       building_name,
       room_number,
       room_key,
       ts,
       co2,
       temperature,
       humidity,
       CASE
           WHEN co2 < 600 THEN 'excellent'
           WHEN co2 < 800 THEN 'normal'
           WHEN co2 <= 1000 THEN 'warning'
           ELSE 'critical' END AS co2_state,
       CASE
           WHEN temperature BETWEEN 20 AND 22 THEN 'excellent'
           WHEN temperature BETWEEN 18 AND 26 THEN 'normal'
           WHEN temperature BETWEEN 16 AND 28 THEN 'warning'
           ELSE 'critical' END AS temperature_state,
       CASE
           WHEN humidity BETWEEN 45 AND 50 THEN 'excellent'
           WHEN humidity BETWEEN 30 AND 70 THEN 'normal'
           WHEN humidity BETWEEN 20 AND 80 THEN 'warning'
           ELSE 'critical' END AS humidity_state,
       CASE
           WHEN co2 < 600 AND temperature BETWEEN 20 AND 22 AND humidity BETWEEN 45 AND 50 THEN 'excellent'
           WHEN co2 > 1000 OR temperature < 16 OR temperature > 28 OR humidity < 20 OR humidity > 80 THEN 'critical'
           WHEN co2 >= 800 OR temperature < 18 OR temperature > 26 OR humidity < 30 OR humidity > 70 THEN 'warning'
           ELSE 'normal'
           END                 AS overall_air_state
FROM sensor_events_base;

CREATE VIEW sensor_latest_view AS
SELECT sensor_id,
       building_name,
       room_number,
       room_key,
       ts,
       co2,
       temperature,
       humidity,
       co2_state,
       temperature_state,
       humidity_state,
       overall_air_state
FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY ts DESC) AS row_num
      FROM sensor_events_scored)
WHERE row_num = 1;

CREATE VIEW room_latest_view AS
SELECT room_key,
       building_name,
       room_number,
       sensor_id,
       ts,
       co2,
       temperature,
       humidity,
       co2_state,
       temperature_state,
       humidity_state,
       overall_air_state
FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY room_key ORDER BY ts DESC) AS row_num
      FROM sensor_events_scored)
WHERE row_num = 1;

CREATE VIEW room_avg_base AS
SELECT '1m'                                             AS agg_period,
       room_key,
       building_name,
       room_number,
       window_start,
       window_end,
       CAST(AVG(CAST(co2 AS DOUBLE)) AS DOUBLE)         AS co2_avg,
       CAST(AVG(CAST(temperature AS DOUBLE)) AS DOUBLE) AS temperature_avg,
       CAST(AVG(CAST(humidity AS DOUBLE)) AS DOUBLE)    AS humidity_avg
FROM TABLE(HOP(TABLE sensor_events_base, DESCRIPTOR(ts), INTERVAL '30' SECOND, INTERVAL '1' MINUTE))
GROUP BY room_key, building_name, room_number, window_start, window_end

UNION ALL

SELECT '1h'                                             AS agg_period,
       room_key,
       building_name,
       room_number,
       window_start,
       window_end,
       CAST(AVG(CAST(co2 AS DOUBLE)) AS DOUBLE)         AS co2_avg,
       CAST(AVG(CAST(temperature AS DOUBLE)) AS DOUBLE) AS temperature_avg,
       CAST(AVG(CAST(humidity AS DOUBLE)) AS DOUBLE)    AS humidity_avg
FROM TABLE(HOP(TABLE sensor_events_base, DESCRIPTOR(ts), INTERVAL '5' MINUTE, INTERVAL '1' HOUR))
GROUP BY room_key, building_name, room_number, window_start, window_end

UNION ALL

SELECT '1d'                                             AS agg_period,
       room_key,
       building_name,
       room_number,
       window_start,
       window_end,
       CAST(AVG(CAST(co2 AS DOUBLE)) AS DOUBLE)         AS co2_avg,
       CAST(AVG(CAST(temperature AS DOUBLE)) AS DOUBLE) AS temperature_avg,
       CAST(AVG(CAST(humidity AS DOUBLE)) AS DOUBLE)    AS humidity_avg
FROM TABLE(HOP(TABLE sensor_events_base, DESCRIPTOR(ts), INTERVAL '1' HOUR, INTERVAL '1' DAY))
GROUP BY room_key, building_name, room_number, window_start, window_end;

CREATE VIEW room_avg_scored AS
SELECT agg_period,
       room_key,
       building_name,
       room_number,
       window_start,
       window_end,
       co2_avg,
       temperature_avg,
       humidity_avg,
       CASE
           WHEN co2_avg < 600 THEN 'excellent'
           WHEN co2_avg < 800 THEN 'normal'
           WHEN co2_avg <= 1000 THEN 'warning'
           ELSE 'critical' END AS co2_state,
       CASE
           WHEN temperature_avg BETWEEN 20 AND 22 THEN 'excellent'
           WHEN temperature_avg BETWEEN 18 AND 26 THEN 'normal'
           WHEN temperature_avg BETWEEN 16 AND 28 THEN 'warning'
           ELSE 'critical' END AS temperature_state,
       CASE
           WHEN humidity_avg BETWEEN 45 AND 50 THEN 'excellent'
           WHEN humidity_avg BETWEEN 30 AND 70 THEN 'normal'
           WHEN humidity_avg BETWEEN 20 AND 80 THEN 'warning'
           ELSE 'critical' END AS humidity_state,
       CASE
           WHEN co2_avg < 600 AND temperature_avg BETWEEN 20 AND 22 AND humidity_avg BETWEEN 45 AND 50 THEN 'excellent'
           WHEN co2_avg > 1000 OR temperature_avg < 16 OR temperature_avg > 28 OR humidity_avg < 20 OR humidity_avg > 80
               THEN 'critical'
           WHEN co2_avg >= 800 OR temperature_avg < 18 OR temperature_avg > 26 OR humidity_avg < 30 OR humidity_avg > 70
               THEN 'warning'
           ELSE 'normal'
           END                 AS overall_air_state
FROM room_avg_base;

CREATE VIEW online_sensors_2m_count_view AS
SELECT 'global' AS summary_key, window_start, window_end, COUNT(DISTINCT sensor_id) AS online_sensors_count
FROM TABLE(HOP(TABLE sensor_events_base, DESCRIPTOR(ts), INTERVAL '30' SECOND, INTERVAL '2' MINUTE))
GROUP BY window_start, window_end;

CREATE VIEW online_sensor_ids_2m_view AS
SELECT 'global' AS summary_key, window_start, window_end, LISTAGG(sensor_id, ',') AS online_sensor_ids_csv
FROM (SELECT DISTINCT window_start, window_end, sensor_id
      FROM TABLE(HOP(TABLE sensor_events_base, DESCRIPTOR(ts), INTERVAL '30' SECOND, INTERVAL '2' MINUTE)))
GROUP BY window_start, window_end;

CREATE VIEW room_last_1m_view AS
SELECT window_start,
       window_end,
       room_key,
       building_name,
       room_number,
       sensor_id,
       ts,
       co2,
       temperature,
       humidity,
       co2_state,
       temperature_state,
       humidity_state,
       overall_air_state
FROM (SELECT window_start,
             window_end,
             room_key,
             building_name,
             room_number,
             sensor_id,
             ts,
             co2,
             temperature,
             humidity,
             co2_state,
             temperature_state,
             humidity_state,
             overall_air_state,
             ROW_NUMBER() OVER (PARTITION BY window_start, window_end, room_key ORDER BY ts DESC) AS row_num
      FROM TABLE(HOP(TABLE sensor_events_scored, DESCRIPTOR(ts), INTERVAL '30' SECOND, INTERVAL '1' MINUTE)))
WHERE row_num = 1;

CREATE VIEW room_bad_counts_1m_view AS
SELECT 'global'                                                        AS summary_key,
       window_start,
       window_end,
       SUM(CASE WHEN co2_state = 'warning' THEN 1 ELSE 0 END)          AS rooms_co2_warning_count,
       SUM(CASE WHEN co2_state = 'critical' THEN 1 ELSE 0 END)         AS rooms_co2_critical_count,
       SUM(CASE WHEN temperature_state = 'warning' THEN 1 ELSE 0 END)  AS rooms_temperature_warning_count,
       SUM(CASE WHEN temperature_state = 'critical' THEN 1 ELSE 0 END) AS rooms_temperature_critical_count,
       SUM(CASE WHEN humidity_state = 'warning' THEN 1 ELSE 0 END)     AS rooms_humidity_warning_count,
       SUM(CASE WHEN humidity_state = 'critical' THEN 1 ELSE 0 END)    AS rooms_humidity_critical_count
FROM room_last_1m_view
GROUP BY window_start, window_end;

CREATE VIEW total_sensors_seen_view AS
SELECT 'global' AS summary_key, COUNT(DISTINCT sensor_id) AS total_sensors_seen
FROM sensor_events_base;

CREATE VIEW global_summary_view AS
SELECT o.summary_key,
       o.window_end                            AS updated_at,
       t.total_sensors_seen,
       o.online_sensors_count,
       COALESCE(ids.online_sensor_ids_csv, '') AS online_sensor_ids_csv,
       r.rooms_co2_warning_count,
       r.rooms_co2_critical_count,
       r.rooms_temperature_warning_count,
       r.rooms_temperature_critical_count,
       r.rooms_humidity_warning_count,
       r.rooms_humidity_critical_count
FROM total_sensors_seen_view t
         JOIN online_sensors_2m_count_view o ON t.summary_key = o.summary_key
         JOIN online_sensor_ids_2m_view ids
              ON o.summary_key = ids.summary_key AND o.window_start = ids.window_start AND o.window_end = ids.window_end
         JOIN room_bad_counts_1m_view r ON o.summary_key = r.summary_key AND o.window_end = r.window_end;

EXECUTE STATEMENT SET
BEGIN

INSERT INTO sensor_latest_sink
SELECT *
FROM sensor_latest_view;

INSERT INTO room_latest_sink
SELECT *
FROM room_latest_view;

INSERT INTO room_avg_1m_sink
SELECT room_key,
       building_name,
       room_number,
       window_start,
       window_end,
       co2_avg,
       temperature_avg,
       humidity_avg,
       co2_state,
       temperature_state,
       humidity_state,
       overall_air_state
FROM room_avg_scored
WHERE agg_period = '1m';

INSERT INTO room_avg_1h_sink
SELECT room_key,
       building_name,
       room_number,
       window_start,
       window_end,
       co2_avg,
       temperature_avg,
       humidity_avg,
       co2_state,
       temperature_state,
       humidity_state,
       overall_air_state
FROM room_avg_scored
WHERE agg_period = '1h';

INSERT INTO room_avg_1d_sink
SELECT room_key,
       building_name,
       room_number,
       window_start,
       window_end,
       co2_avg,
       temperature_avg,
       humidity_avg,
       co2_state,
       temperature_state,
       humidity_state,
       overall_air_state
FROM room_avg_scored
WHERE agg_period = '1d';

INSERT INTO global_summary_sink
SELECT *
FROM global_summary_view;

END;