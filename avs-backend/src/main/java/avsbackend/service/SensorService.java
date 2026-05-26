package avsbackend.service;

import avsbackend.config.AppProperties;
import avsbackend.exception.BadRequestException;
import avsbackend.exception.NotFoundException;
import avsbackend.model.api.SensorCurrentResponse;
import avsbackend.model.api.SensorListItemDto;
import avsbackend.model.api.SensorListResponse;
import avsbackend.model.api.SeriesPointDto;
import avsbackend.model.api.SeriesResponse;
import avsbackend.model.api.StatsResponse;
import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.ParamStatus;
import avsbackend.repository.SensorJdbcRepository;
import avsbackend.util.AirStatusEvaluator;
import avsbackend.util.BuildingIdMapper;
import avsbackend.util.RedisValueReader;
import avsbackend.util.RoomKeyCodec;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
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

    public SensorListResponse listAll(String period, String buildingId) {
        String normalizedPeriod = normalizePeriod(period);
        String buildingFilter = resolveBuildingNameFilter(buildingId);

        List<SensorListItemDto> items = "latest".equals(normalizedPeriod)
                ? listLatest(buildingFilter)
                : listAggregated(normalizedPeriod, buildingFilter);

        return new SensorListResponse(normalizedPeriod, items);
    }

    private List<SensorListItemDto> listLatest(String buildingNameFilter) {
        String prefix = appProperties.getRedis().getKeyspaces().getSensorLatest() + ":";

        return redisReadService.readHashesByPrefix(prefix).stream()
                .filter(raw -> buildingNameFilter == null
                        || buildingNameFilter.equals(RedisValueReader.string(raw, "building_name")))
                .map(this::toLatestItem)
                .sorted(Comparator
                        .comparing(SensorListItemDto::buildingName, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(SensorListItemDto::roomNumber, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(SensorListItemDto::sensorId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private SensorListItemDto toLatestItem(Map<String, String> raw) {
        String buildingName = RedisValueReader.string(raw, "building_name");

        return new SensorListItemDto(
                RedisValueReader.string(raw, "sensor_id"),
                RedisValueReader.string(raw, "room_key"),
                BuildingIdMapper.toBuildingId(buildingName),
                buildingName,
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

    private List<SensorListItemDto> listAggregated(String period, String buildingNameFilter) {
        Instant to = Instant.now();
        Instant from = to.minus(periodDuration(period));

        return repository.findAllSensorsAggregated(from, to, buildingNameFilter).stream()
                .map(row -> {
                    ParamStatus co2 = AirStatusEvaluator.co2Status(row.co2Avg());
                    ParamStatus temp = AirStatusEvaluator.temperatureStatus(row.temperatureAvg());
                    ParamStatus hum = AirStatusEvaluator.humidityStatus(row.humidityAvg());

                    Integer co2Int = row.co2Avg() == null ? null : (int) Math.round(row.co2Avg());

                    return new SensorListItemDto(
                            row.sensorId(),
                            RoomKeyCodec.encode(row.buildingName(), row.roomNumber()),
                            BuildingIdMapper.toBuildingId(row.buildingName()),
                            row.buildingName(),
                            row.roomNumber(),
                            row.lastTs() == null ? null : row.lastTs().toString(),
                            co2Int,
                            row.temperatureAvg(),
                            row.humidityAvg(),
                            co2, temp, hum,
                            AirStatusEvaluator.overall(co2, temp, hum)
                    );
                })
                .toList();
    }

    private Duration periodDuration(String period) {
        return switch (period) {
            case "1m" -> Duration.ofMinutes(1);
            case "1h" -> Duration.ofHours(1);
            case "1d" -> Duration.ofDays(1);
            default -> throw new BadRequestException("Unsupported period: " + period);
        };
    }

    private String normalizePeriod(String period) {
        String value = period == null ? "latest" : period.trim().toLowerCase();
        return switch (value) {
            case "", "latest" -> "latest";
            case "1m", "1h", "1d" -> value;
            default -> throw new BadRequestException("period must be one of: latest, 1m, 1h, 1d");
        };
    }

    private String resolveBuildingNameFilter(String buildingId) {
        if (buildingId == null || buildingId.isBlank()) {
            return null;
        }
        return BuildingIdMapper.toBuildingName(buildingId)
                .orElseThrow(() -> new BadRequestException("Unknown buildingId: " + buildingId));
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