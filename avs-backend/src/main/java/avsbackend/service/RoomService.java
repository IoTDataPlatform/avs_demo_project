package avsbackend.service;

import avsbackend.config.AppProperties;
import avsbackend.exception.NotFoundException;
import avsbackend.model.api.*;
import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.ParamStatus;
import avsbackend.repository.SensorJdbcRepository;
import avsbackend.util.RedisValueReader;
import avsbackend.util.RoomKeyCodec;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class RoomService {

    private final RedisReadService redisReadService;
    private final SensorJdbcRepository repository;
    private final AppProperties appProperties;

    public RoomService(
            RedisReadService redisReadService,
            SensorJdbcRepository repository,
            AppProperties appProperties
    ) {
        this.redisReadService = redisReadService;
        this.repository = repository;
        this.appProperties = appProperties;
    }

    public RoomCurrentResponse getCurrent(String roomKey) {
        Map<String, String> raw = redisReadService.readHash(
                appProperties.getRedis().getKeyspaces().getRoomLatest() + ":" + roomKey
        );

        if (raw.isEmpty()) {
            throw new NotFoundException("Room current state not found");
        }

        return new RoomCurrentResponse(
                RedisValueReader.string(raw, "room_key"),
                RedisValueReader.string(raw, "building_name"),
                RedisValueReader.string(raw, "room_number"),
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

    public RoomAggregatesResponse getAggregates(String roomKey) {
        return new RoomAggregatesResponse(
                roomKey,
                readAggregate(appProperties.getRedis().getKeyspaces().getRoomAvg1m(), roomKey, "1m"),
                readAggregate(appProperties.getRedis().getKeyspaces().getRoomAvg1h(), roomKey, "1h"),
                readAggregate(appProperties.getRedis().getKeyspaces().getRoomAvg1d(), roomKey, "1d")
        );
    }

    public SeriesResponse getSeries(String roomKey, Instant from, Instant to, String step) {
        validateRange(from, to);
        String truncUnit = normalizeStep(step);

        RoomKeyCodec.DecodedRoomKey decoded = RoomKeyCodec.decode(roomKey);

        List<SeriesPointDto> points = repository.findRoomSeries(
                        decoded.buildingName(),
                        decoded.roomNumber(),
                        from,
                        to,
                        truncUnit
                ).stream()
                .map(row -> new SeriesPointDto(
                        row.bucket().toString(),
                        row.co2Avg(),
                        row.temperatureAvg(),
                        row.humidityAvg()
                ))
                .toList();

        return new SeriesResponse("room", roomKey, from.toString(), to.toString(), truncUnit, points);
    }

    public StatsResponse getStats(String roomKey, Instant from, Instant to) {
        validateRange(from, to);

        RoomKeyCodec.DecodedRoomKey decoded = RoomKeyCodec.decode(roomKey);

        SensorJdbcRepository.StatsAggRow row = repository.getRoomStats(
                        decoded.buildingName(),
                        decoded.roomNumber(),
                        from,
                        to
                )
                .orElseThrow(() -> new NotFoundException("No room data for requested period"));

        return StatsResponse.forRoom(
                roomKey,
                decoded.buildingName(),
                decoded.roomNumber(),
                from.toString(),
                to.toString(),
                row
        );
    }

    private AggregateSnapshotDto readAggregate(String keyspace, String roomKey, String period) {
        Map<String, String> raw = redisReadService.readHash(keyspace + ":" + roomKey);
        if (raw.isEmpty()) {
            return null;
        }

        return new AggregateSnapshotDto(
                period,
                RedisValueReader.string(raw, "room_key"),
                RedisValueReader.string(raw, "building_name"),
                RedisValueReader.string(raw, "room_number"),
                RedisValueReader.string(raw, "window_start"),
                RedisValueReader.string(raw, "window_end"),
                RedisValueReader.doubleValue(raw, "co2_avg"),
                RedisValueReader.doubleValue(raw, "temperature_avg"),
                RedisValueReader.doubleValue(raw, "humidity_avg"),
                ParamStatus.from(RedisValueReader.string(raw, "co2_state")),
                ParamStatus.from(RedisValueReader.string(raw, "temperature_state")),
                ParamStatus.from(RedisValueReader.string(raw, "humidity_state")),
                OverallStatus.from(RedisValueReader.string(raw, "overall_air_state"))
        );
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