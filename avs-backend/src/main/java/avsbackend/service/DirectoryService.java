package avsbackend.service;

import avsbackend.config.AppProperties;
import avsbackend.exception.BadRequestException;
import avsbackend.model.api.*;
import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.ParamStatus;
import avsbackend.repository.SensorJdbcRepository;
import avsbackend.util.BuildingIdMapper;
import avsbackend.util.RedisValueReader;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DirectoryService {

    private final SensorJdbcRepository repository;
    private final RedisReadService redisReadService;
    private final AppProperties appProperties;

    public DirectoryService(
            SensorJdbcRepository repository,
            RedisReadService redisReadService,
            AppProperties appProperties
    ) {
        this.repository = repository;
        this.redisReadService = redisReadService;
        this.appProperties = appProperties;
    }

    public BuildingsResponse getBuildings() {
        List<BuildingDto> buildings = repository.findBuildingNames().stream()
                .map(name -> new BuildingDto(BuildingIdMapper.toBuildingId(name), name))
                .toList();

        return new BuildingsResponse(buildings);
    }

    public RoomsResponse getRooms(String buildingId, String period) {
        String normalizedPeriod = normalizePeriod(period);

        final String buildingName;
        if (buildingId != null && !buildingId.isBlank()) {
            buildingName = BuildingIdMapper.toBuildingName(buildingId)
                    .orElseThrow(() -> new BadRequestException("Unknown buildingId: " + buildingId));
        } else {
            buildingName = null;
        }

        List<Map<String, String>> latestHashes = redisReadService.readHashesByPrefix(
                        appProperties.getRedis().getKeyspaces().getRoomLatest() + ":"
                ).stream()
                .filter(map -> buildingName == null
                        || buildingName.equals(RedisValueReader.string(map, "building_name")))
                .toList();

        Map<String, Map<String, String>> aggregateByRoomKey =
                "latest".equals(normalizedPeriod) ? Map.of() : readAggregateMap(normalizedPeriod);

        List<RoomCardDto> rooms = latestHashes.stream()
                .map(latest -> "latest".equals(normalizedPeriod)
                        ? toRoomCard(latest)
                        : toRoomCardWithAggregate(latest, aggregateByRoomKey))
                .sorted(Comparator.comparing(RoomCardDto::buildingName).thenComparing(RoomCardDto::roomNumber))
                .toList();

        return new RoomsResponse(rooms);
    }

    private String normalizePeriod(String period) {
        String value = period == null ? "latest" : period.trim().toLowerCase();
        return switch (value) {
            case "", "latest" -> "latest";
            case "1m", "1h", "1d" -> value;
            default -> throw new BadRequestException("period must be one of: latest, 1m, 1h, 1d");
        };
    }

    private Map<String, Map<String, String>> readAggregateMap(String period) {
        String prefix = aggregateKeyspace(period) + ":";

        Map<String, Map<String, String>> byRoomKey = new HashMap<>();
        for (Map<String, String> raw : redisReadService.readHashesByPrefix(prefix)) {
            String roomKey = RedisValueReader.string(raw, "room_key");
            if (roomKey != null) {
                byRoomKey.put(roomKey, raw);
            }
        }
        return byRoomKey;
    }

    private String aggregateKeyspace(String period) {
        return switch (period) {
            case "1m" -> appProperties.getRedis().getKeyspaces().getRoomAvg1m();
            case "1h" -> appProperties.getRedis().getKeyspaces().getRoomAvg1h();
            case "1d" -> appProperties.getRedis().getKeyspaces().getRoomAvg1d();
            default -> throw new BadRequestException("Unsupported period: " + period);
        };
    }

    private RoomCardDto toRoomCardWithAggregate(
            Map<String, String> latest,
            Map<String, Map<String, String>> aggregateByRoomKey
    ) {
        String roomKey = RedisValueReader.string(latest, "room_key");
        Map<String, String> agg = aggregateByRoomKey.get(roomKey);
        if (agg == null || agg.isEmpty()) {
            return toRoomCard(latest);
        }

        String buildingName = RedisValueReader.string(latest, "building_name");
        Double co2Avg = RedisValueReader.doubleValue(agg, "co2_avg");

        return new RoomCardDto(
                roomKey,
                BuildingIdMapper.toBuildingId(buildingName),
                buildingName,
                RedisValueReader.string(latest, "room_number"),
                RedisValueReader.string(latest, "sensor_id"),
                RedisValueReader.string(agg, "window_end"),
                co2Avg == null ? null : (int) Math.round(co2Avg),
                RedisValueReader.doubleValue(agg, "temperature_avg"),
                RedisValueReader.doubleValue(agg, "humidity_avg"),
                ParamStatus.from(RedisValueReader.string(agg, "co2_state")),
                ParamStatus.from(RedisValueReader.string(agg, "temperature_state")),
                ParamStatus.from(RedisValueReader.string(agg, "humidity_state")),
                OverallStatus.from(RedisValueReader.string(agg, "overall_air_state"))
        );
    }

    public SensorsResponse getRoomSensors(String roomKey) {
        var decoded = avsbackend.util.RoomKeyCodec.decode(roomKey);

        List<SensorDto> sensors = repository.findSensorsByRoom(decoded.buildingName(), decoded.roomNumber()).stream()
                .map(SensorDto::new)
                .toList();

        return new SensorsResponse(roomKey, decoded.buildingName(), decoded.roomNumber(), sensors);
    }

    private RoomCardDto toRoomCard(Map<String, String> raw) {
        String buildingName = RedisValueReader.string(raw, "building_name");
        String roomNumber = RedisValueReader.string(raw, "room_number");

        return new RoomCardDto(
                RedisValueReader.string(raw, "room_key"),
                BuildingIdMapper.toBuildingId(buildingName),
                buildingName,
                roomNumber,
                RedisValueReader.string(raw, "sensor_id"),
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
}