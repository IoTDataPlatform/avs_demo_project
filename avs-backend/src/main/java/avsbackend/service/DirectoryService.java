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

    public RoomsResponse getRooms(String buildingId) {
        final String buildingName;
        if (buildingId != null && !buildingId.isBlank()) {
            buildingName = BuildingIdMapper.toBuildingName(buildingId)
                    .orElseThrow(() -> new BadRequestException("Unknown buildingId: " + buildingId));
        } else {
            buildingName = null;
        }

        List<RoomCardDto> rooms = redisReadService.readHashesByPrefix(
                        appProperties.getRedis().getKeyspaces().getRoomLatest() + ":"
                ).stream()
                .filter(map -> buildingName == null || buildingName.equals(RedisValueReader.string(map, "building_name")))
                .map(this::toRoomCard)
                .sorted(Comparator.comparing(RoomCardDto::buildingName).thenComparing(RoomCardDto::roomNumber))
                .toList();

        return new RoomsResponse(rooms);
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