package avsbackend.service;

import avsbackend.config.AppProperties;
import avsbackend.exception.NotFoundException;
import avsbackend.model.api.SensorCurrentResponse;
import avsbackend.model.api.SeriesPointDto;
import avsbackend.model.api.SeriesResponse;
import avsbackend.model.api.StatsResponse;
import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.ParamStatus;
import avsbackend.repository.SensorJdbcRepository;
import avsbackend.util.RedisValueReader;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class SensorService {

    private final RedisReadService redisReadService;
    private final SensorJdbcRepository repository;
    private final AppProperties appProperties;

    public SensorService(
            RedisReadService redisReadService,
            SensorJdbcRepository repository,
            AppProperties appProperties
    ) {
        this.redisReadService = redisReadService;
        this.repository = repository;
        this.appProperties = appProperties;
    }

    public SensorCurrentResponse getCurrent(String sensorId) {
        Map<String, String> raw = redisReadService.readHash(
                appProperties.getRedis().getKeyspaces().getSensorLatest() + ":" + sensorId
        );

        if (raw.isEmpty()) {
            throw new NotFoundException("Sensor current state not found");
        }

        return new SensorCurrentResponse(
                RedisValueReader.string(raw, "sensor_id"),
                RedisValueReader.string(raw, "room_key"),
                RedisValueReader.string(raw, "building_name"),
                RedisValueReader.string(raw, "room_number"),
                RedisValueReader.string(raw, "ts"),
                RedisValueReader.integerValue(raw, "co2"),
                RedisValueReader.doubleValue(raw, "temperature"),
                RedisValueReader.doubleValue(raw, "humidity"),
                ParamStatus.from(RedisValueReader.string(raw, "co2_state")),
                ParamStatus.from(RedisValueReader.string(raw, "temperature_state")),
                ParamStatus.from(RedisValueReader.string(raw, "humidity_state")),
                OverallStatus.from(RedisValueReader.string(raw, "overall_air_state"))
        );
    }

    public SeriesResponse getSeries(String sensorId, Instant from, Instant to, String step) {
        validateRange(from, to);
        String truncUnit = normalizeStep(step);

        List<SeriesPointDto> points = repository.findSensorSeries(sensorId, from, to, truncUnit).stream()
                .map(row -> new SeriesPointDto(
                        row.bucket().toString(),
                        row.co2Avg(),
                        row.temperatureAvg(),
                        row.humidityAvg()
                ))
                .toList();

        return new SeriesResponse("sensor", sensorId, from.toString(), to.toString(), truncUnit, points);
    }

    public StatsResponse getStats(String sensorId, Instant from, Instant to) {
        validateRange(from, to);

        SensorJdbcRepository.StatsAggRow row = repository.getSensorStats(sensorId, from, to)
                .orElseThrow(() -> new NotFoundException("No sensor data for requested period"));

        return StatsResponse.forSensor(sensorId, from.toString(), to.toString(), row);
    }

    private void validateRange(Instant from, Instant to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("from must be <= to");
        }
    }

    private String normalizeStep(String step) {
        return switch (step == null ? "hour" : step.trim().toLowerCase()) {
            case "minute" -> "minute";
            case "hour" -> "hour";
            case "day" -> "day";
            case "month" -> "month";
            default -> throw new IllegalArgumentException("step must be one of: minute, hour, day, month");
        };
    }
}