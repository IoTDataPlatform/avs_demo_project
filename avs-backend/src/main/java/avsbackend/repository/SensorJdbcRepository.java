package avsbackend.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Repository
public class SensorJdbcRepository {

    private final JdbcClient jdbcClient;

    public SensorJdbcRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<String> findBuildingNames() {
        return jdbcClient.sql("""
                SELECT DISTINCT building_name
                FROM sensors
                ORDER BY building_name
                """).query((rs, rowNum) -> rs.getString("building_name")).list();
    }

    public boolean roomExists(String roomNumber) {
        Integer value = jdbcClient.sql("""
                SELECT 1
                FROM sensors
                WHERE room_number = :roomNumber
                LIMIT 1
                """).param("roomNumber", roomNumber).query(Integer.class).optional().orElse(null);
        return value != null;
    }

    public List<LatestRoomRow> findLatestRooms(String buildingName) {
        if (buildingName == null || buildingName.isBlank()) {
            return jdbcClient.sql("""
                SELECT DISTINCT ON (room_number)
                       sensor_id, building_name, room_number, ts, co2, temperature, humidity
                FROM sensors
                ORDER BY room_number, ts DESC
                """)
                    .query(this::mapLatestRoomRow)
                    .list();
        }

        return jdbcClient.sql("""
            SELECT DISTINCT ON (room_number)
                   sensor_id, building_name, room_number, ts, co2, temperature, humidity
            FROM sensors
            WHERE building_name = :buildingName
            ORDER BY room_number, ts DESC
            """)
                .param("buildingName", buildingName)
                .query(this::mapLatestRoomRow)
                .list();
    }

    public Optional<RoomMeta> findRoomMeta(String roomNumber) {
        return jdbcClient.sql("""
                SELECT DISTINCT ON (room_number)
                       building_name, room_number
                FROM sensors
                WHERE room_number = :roomNumber
                ORDER BY room_number, ts DESC
                """)
                .param("roomNumber", roomNumber)
                .query((rs, rowNum) -> new RoomMeta(
                        rs.getString("building_name"),
                        rs.getString("room_number")
                ))
                .optional();
    }

    public long countHistoryRaw(String roomNumber, Instant from, Instant to) {
        Long result = jdbcClient.sql("""
            SELECT COUNT(*)
            FROM sensors
            WHERE room_number = :roomNumber
              AND ts BETWEEN :from AND :to
            """)
                .param("roomNumber", roomNumber)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query(Long.class)
                .single();

        return result == null ? 0 : result;
    }

    public long countHistoryGrouped(String roomNumber, Instant from, Instant to, String truncUnit) {
        String sql = """
            SELECT COUNT(*)
            FROM (
                SELECT date_trunc('%s', ts)
                FROM sensors
                WHERE room_number = :roomNumber
                  AND ts BETWEEN :from AND :to
                GROUP BY 1
            ) x
            """.formatted(truncUnit);

        Long result = jdbcClient.sql(sql)
                .param("roomNumber", roomNumber)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query(Long.class)
                .single();

        return result == null ? 0 : result;
    }

    public List<HistoryRow> findHistoryRaw(String roomNumber, Instant from, Instant to, int limit, int offset) {
        return jdbcClient.sql("""
            SELECT ts, co2, temperature, humidity
            FROM sensors
            WHERE room_number = :roomNumber
              AND ts BETWEEN :from AND :to
            ORDER BY ts
            LIMIT :limit OFFSET :offset
            """)
                .param("roomNumber", roomNumber)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .param("limit", limit)
                .param("offset", offset)
                .query(this::mapHistoryRow)
                .list();
    }

    public List<HistoryRow> findHistoryGrouped(String roomNumber, Instant from, Instant to, String truncUnit, int limit, int offset) {
        String sql = """
            SELECT date_trunc('%s', ts) AS ts,
                   CAST(AVG(co2) AS double precision) AS co2,
                   CAST(AVG(temperature) AS double precision) AS temperature,
                   CAST(AVG(humidity) AS double precision) AS humidity
            FROM sensors
            WHERE room_number = :roomNumber
              AND ts BETWEEN :from AND :to
            GROUP BY 1
            ORDER BY 1
            LIMIT :limit OFFSET :offset
            """.formatted(truncUnit);

        return jdbcClient.sql(sql)
                .param("roomNumber", roomNumber)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .param("limit", limit)
                .param("offset", offset)
                .query(this::mapHistoryRow)
                .list();
    }

    public Optional<StatsAggRow> getStats(String roomNumber, Instant from, Instant to) {
        return jdbcClient.sql("""
            SELECT
                CAST(AVG(co2) AS double precision) AS co2_avg,
                CAST(percentile_cont(0.5) within group (order by co2) AS double precision) AS co2_median,
                CAST(MIN(co2) AS double precision) AS co2_min,
                CAST(MAX(co2) AS double precision) AS co2_max,
                CAST(AVG(CASE WHEN co2 < 800 THEN 100.0 ELSE 0.0 END) AS double precision) AS co2_percent_in_norm,

                CAST(AVG(temperature) AS double precision) AS temperature_avg,
                CAST(percentile_cont(0.5) within group (order by temperature) AS double precision) AS temperature_median,
                CAST(MIN(temperature) AS double precision) AS temperature_min,
                CAST(MAX(temperature) AS double precision) AS temperature_max,
                CAST(AVG(CASE WHEN temperature BETWEEN 18 AND 26 THEN 100.0 ELSE 0.0 END) AS double precision) AS temperature_percent_in_norm,

                CAST(AVG(humidity) AS double precision) AS humidity_avg,
                CAST(percentile_cont(0.5) within group (order by humidity) AS double precision) AS humidity_median,
                CAST(MIN(humidity) AS double precision) AS humidity_min,
                CAST(MAX(humidity) AS double precision) AS humidity_max,
                CAST(AVG(CASE WHEN humidity BETWEEN 30 AND 70 THEN 100.0 ELSE 0.0 END) AS double precision) AS humidity_percent_in_norm
            FROM sensors
            WHERE room_number = :roomNumber
              AND ts BETWEEN :from AND :to
            """)
                .param("roomNumber", roomNumber)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query((rs, rowNum) -> new StatsAggRow(
                        getDouble(rs, "co2_avg"),
                        getDouble(rs, "co2_median"),
                        getDouble(rs, "co2_min"),
                        getDouble(rs, "co2_max"),
                        getDouble(rs, "co2_percent_in_norm"),
                        getDouble(rs, "temperature_avg"),
                        getDouble(rs, "temperature_median"),
                        getDouble(rs, "temperature_min"),
                        getDouble(rs, "temperature_max"),
                        getDouble(rs, "temperature_percent_in_norm"),
                        getDouble(rs, "humidity_avg"),
                        getDouble(rs, "humidity_median"),
                        getDouble(rs, "humidity_min"),
                        getDouble(rs, "humidity_max"),
                        getDouble(rs, "humidity_percent_in_norm")
                ))
                .optional();
    }

    public List<PeakHourRow> findPeakHours(String roomNumber, Instant from, Instant to) {
        return jdbcClient.sql("""
            SELECT CAST(EXTRACT(HOUR FROM ts) AS integer) AS hour,
                   CAST(AVG(co2) AS double precision) AS avg_co2
            FROM sensors
            WHERE room_number = :roomNumber
              AND ts BETWEEN :from AND :to
            GROUP BY 1
            ORDER BY 1
            """)
                .param("roomNumber", roomNumber)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query((rs, rowNum) -> new PeakHourRow(
                        rs.getInt("hour"),
                        getDouble(rs, "avg_co2")
                ))
                .list();
    }

    public List<CompareRow> compareRooms(List<String> roomNumbers, Instant from, Instant to) {
        return jdbcClient.sql("""
            SELECT room_number,
                   MAX(building_name) AS building_name,
                   CAST(AVG(co2) AS double precision) AS co2_avg,
                   CAST(AVG(CASE WHEN co2 < 800 THEN 100.0 ELSE 0.0 END) AS double precision) AS co2_percent_in_norm,
                   CAST(AVG(temperature) AS double precision) AS temperature_avg,
                   CAST(AVG(humidity) AS double precision) AS humidity_avg
            FROM sensors
            WHERE room_number IN (:roomNumbers)
              AND ts BETWEEN :from AND :to
            GROUP BY room_number
            ORDER BY room_number
            """)
                .param("roomNumbers", roomNumbers)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query((rs, rowNum) -> new CompareRow(
                        rs.getString("building_name"),
                        rs.getString("room_number"),
                        getDouble(rs, "co2_avg"),
                        getDouble(rs, "co2_percent_in_norm"),
                        getDouble(rs, "temperature_avg"),
                        getDouble(rs, "humidity_avg")
                ))
                .list();
    }

    private LatestRoomRow mapLatestRoomRow(ResultSet rs, int rowNum) throws SQLException {
        return new LatestRoomRow(
                rs.getString("sensor_id"),
                rs.getString("building_name"),
                rs.getString("room_number"),
                rs.getTimestamp("ts").toInstant(),
                rs.getInt("co2"),
                rs.getDouble("temperature"),
                rs.getDouble("humidity")
        );
    }

    private HistoryRow mapHistoryRow(ResultSet rs, int rowNum) throws SQLException {
        return new HistoryRow(
                rs.getTimestamp("ts").toInstant(),
                getDouble(rs, "co2"),
                getDouble(rs, "temperature"),
                getDouble(rs, "humidity")
        );
    }

    private Double getDouble(ResultSet rs, String column) throws SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : ((Number) value).doubleValue();
    }

    public record LatestRoomRow(
            String sensorId,
            String buildingName,
            String roomNumber,
            Instant ts,
            Integer co2,
            Double temperature,
            Double humidity
    ) {}

    public record RoomMeta(
            String buildingName,
            String roomNumber
    ) {}

    public record HistoryRow(
            Instant ts,
            Double co2,
            Double temperature,
            Double humidity
    ) {}

    public record PeakHourRow(
            Integer hour,
            Double avgCo2
    ) {}

    public record CompareRow(
            String buildingName,
            String roomNumber,
            Double co2Avg,
            Double co2PercentInNorm,
            Double temperatureAvg,
            Double humidityAvg
    ) {}

    public record StatsAggRow(
            Double co2Avg,
            Double co2Median,
            Double co2Min,
            Double co2Max,
            Double co2PercentInNorm,
            Double temperatureAvg,
            Double temperatureMedian,
            Double temperatureMin,
            Double temperatureMax,
            Double temperaturePercentInNorm,
            Double humidityAvg,
            Double humidityMedian,
            Double humidityMin,
            Double humidityMax,
            Double humidityPercentInNorm
    ) {}

    private OffsetDateTime toOffsetDateTime(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }
}
