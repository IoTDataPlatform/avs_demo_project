package avsbackend.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Repository
public class SensorJdbcRepository {

    private final JdbcClient jdbcClient;

    public SensorJdbcRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<String> findBuildingNames() {
        return jdbcClient.sql("""
                SELECT DISTINCT building_name
                FROM sensor_readings
                ORDER BY building_name
                """)
                .query((rs, rowNum) -> rs.getString("building_name"))
                .list();
    }

    public List<String> findSensorsByRoom(String buildingName, String roomNumber) {
        return jdbcClient.sql("""
                SELECT DISTINCT sensor_id
                FROM sensor_readings
                WHERE building_name = :buildingName
                  AND room_number = :roomNumber
                ORDER BY sensor_id
                """)
                .param("buildingName", buildingName)
                .param("roomNumber", roomNumber)
                .query((rs, rowNum) -> rs.getString("sensor_id"))
                .list();
    }

    public List<SeriesRow> findRoomSeries(String buildingName, String roomNumber, Instant from, Instant to, String truncUnit) {
        String sql = """
                SELECT date_trunc('%s', ts) AS bucket,
                       CAST(AVG(co2) AS double precision) AS co2_avg,
                       CAST(AVG(temperature) AS double precision) AS temperature_avg,
                       CAST(AVG(humidity) AS double precision) AS humidity_avg
                FROM sensor_readings
                WHERE building_name = :buildingName
                  AND room_number = :roomNumber
                  AND ts BETWEEN :from AND :to
                GROUP BY 1
                ORDER BY 1
                """.formatted(truncUnit);

        return jdbcClient.sql(sql)
                .param("buildingName", buildingName)
                .param("roomNumber", roomNumber)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query(this::mapSeriesRow)
                .list();
    }

    public List<SeriesRow> findSensorSeries(String sensorId, Instant from, Instant to, String truncUnit) {
        String sql = """
                SELECT date_trunc('%s', ts) AS bucket,
                       CAST(AVG(co2) AS double precision) AS co2_avg,
                       CAST(AVG(temperature) AS double precision) AS temperature_avg,
                       CAST(AVG(humidity) AS double precision) AS humidity_avg
                FROM sensor_readings
                WHERE sensor_id = :sensorId
                  AND ts BETWEEN :from AND :to
                GROUP BY 1
                ORDER BY 1
                """.formatted(truncUnit);

        return jdbcClient.sql(sql)
                .param("sensorId", sensorId)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query(this::mapSeriesRow)
                .list();
    }

    public Optional<StatsAggRow> getRoomStats(String buildingName, String roomNumber, Instant from, Instant to) {
        return jdbcClient.sql(statsSql("""
                WHERE building_name = :buildingName
                  AND room_number = :roomNumber
                  AND ts BETWEEN :from AND :to
                """))
                .param("buildingName", buildingName)
                .param("roomNumber", roomNumber)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query(this::mapStatsRow)
                .optional();
    }

    public Optional<StatsAggRow> getSensorStats(String sensorId, Instant from, Instant to) {
        return jdbcClient.sql(statsSql("""
                WHERE sensor_id = :sensorId
                  AND ts BETWEEN :from AND :to
                """))
                .param("sensorId", sensorId)
                .param("from", toOffsetDateTime(from))
                .param("to", toOffsetDateTime(to))
                .query(this::mapStatsRow)
                .optional();
    }

    private String statsSql(String whereClause) {
        return """
                SELECT
                    CAST(AVG(co2) AS double precision) AS co2_avg,
                    CAST(percentile_cont(0.5) WITHIN GROUP (ORDER BY co2) AS double precision) AS co2_median,
                    CAST(MIN(co2) AS double precision) AS co2_min,
                    CAST(MAX(co2) AS double precision) AS co2_max,
                    CAST(AVG(CASE WHEN co2 < 800 THEN 100.0 ELSE 0.0 END) AS double precision) AS co2_percent_in_norm,

                    CAST(AVG(temperature) AS double precision) AS temperature_avg,
                    CAST(percentile_cont(0.5) WITHIN GROUP (ORDER BY temperature) AS double precision) AS temperature_median,
                    CAST(MIN(temperature) AS double precision) AS temperature_min,
                    CAST(MAX(temperature) AS double precision) AS temperature_max,
                    CAST(AVG(CASE WHEN temperature BETWEEN 18 AND 26 THEN 100.0 ELSE 0.0 END) AS double precision) AS temperature_percent_in_norm,

                    CAST(AVG(humidity) AS double precision) AS humidity_avg,
                    CAST(percentile_cont(0.5) WITHIN GROUP (ORDER BY humidity) AS double precision) AS humidity_median,
                    CAST(MIN(humidity) AS double precision) AS humidity_min,
                    CAST(MAX(humidity) AS double precision) AS humidity_max,
                    CAST(AVG(CASE WHEN humidity BETWEEN 30 AND 70 THEN 100.0 ELSE 0.0 END) AS double precision) AS humidity_percent_in_norm
                FROM sensor_readings
                """ + whereClause;
    }

    private SeriesRow mapSeriesRow(ResultSet rs, int rowNum) throws SQLException {
        return new SeriesRow(
                rs.getTimestamp("bucket").toInstant(),
                getDouble(rs, "co2_avg"),
                getDouble(rs, "temperature_avg"),
                getDouble(rs, "humidity_avg")
        );
    }

    private StatsAggRow mapStatsRow(ResultSet rs, int rowNum) throws SQLException {
        return new StatsAggRow(
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
        );
    }

    private Double getDouble(ResultSet rs, String column) throws SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : ((Number) value).doubleValue();
    }

    private OffsetDateTime toOffsetDateTime(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }

    public record SeriesRow(
            Instant bucket,
            Double co2Avg,
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
}