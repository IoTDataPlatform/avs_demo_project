package avsbackend.service;

import avsbackend.exception.BadRequestException;
import avsbackend.exception.NotFoundException;
import avsbackend.model.api.*;
import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.SensorStatus;
import avsbackend.repository.SensorJdbcRepository;
import avsbackend.util.BuildingIdMapper;
import avsbackend.util.IdCodec;
import avsbackend.util.StatusCalculator;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class SensorQueryService {

    private final SensorJdbcRepository repository;

    public SensorQueryService(SensorJdbcRepository repository) {
        this.repository = repository;
    }

    public BuildingsResponse getBuildings() {
        List<BuildingDto> buildings = repository.findBuildingNames().stream()
                .map(name -> new BuildingDto(BuildingIdMapper.toBuildingId(name), name))
                .toList();
        return new BuildingsResponse(buildings);
    }

    public RoomsResponse getRooms(String buildingId) {
        String buildingName = mapBuildingIdToName(buildingId);

        List<RoomSummaryDto> rooms = repository.findLatestRooms(buildingName).stream()
                .map(row -> {
                    OverallStatus overallStatus = StatusCalculator.overallStatus(
                            row.co2(), row.temperature(), row.humidity()
                    );
                    return new RoomSummaryDto(
                            IdCodec.roomIdFromRoomNumber(row.roomNumber()),
                            BuildingIdMapper.toBuildingId(row.buildingName()),
                            row.buildingName(),
                            row.roomNumber(),
                            row.sensorId(),
                            SensorStatus.ONLINE,
                            row.ts().toString(),
                            row.co2(),
                            row.temperature(),
                            row.humidity(),
                            overallStatus
                    );
                })
                .toList();

        return new RoomsResponse(rooms);
    }

    public HistoryResponse getRoomHistory(String roomId, Instant from, Instant to, String interval, int limit, int offset) {
        validateRange(from, to, limit, offset);
        String roomNumber = IdCodec.roomNumberFromRoomId(roomId);
        ensureRoomExists(roomNumber);

        long total;
        List<DataPointDto> data;

        switch (interval == null ? "1h" : interval) {
            case "raw" -> {
                total = repository.countHistoryRaw(roomNumber, from, to);
                data = repository.findHistoryRaw(roomNumber, from, to, limit, offset).stream()
                        .map(row -> new DataPointDto(row.ts().toString(), row.co2(), row.temperature(), row.humidity()))
                        .toList();
            }
            case "1h" -> {
                total = repository.countHistoryGrouped(roomNumber, from, to, "hour");
                data = repository.findHistoryGrouped(roomNumber, from, to, "hour", limit, offset).stream()
                        .map(row -> new DataPointDto(row.ts().toString(), row.co2(), row.temperature(), row.humidity()))
                        .toList();
            }
            case "1d" -> {
                total = repository.countHistoryGrouped(roomNumber, from, to, "day");
                data = repository.findHistoryGrouped(roomNumber, from, to, "day", limit, offset).stream()
                        .map(row -> new DataPointDto(row.ts().toString(), row.co2(), row.temperature(), row.humidity()))
                        .toList();
            }
            default -> throw new BadRequestException("interval must be one of: raw, 1h, 1d");
        }

        return new HistoryResponse(roomId, from.toString(), to.toString(), interval == null ? "1h" : interval, limit, offset, total, data);
    }

    public StatsResponse getRoomStats(String roomId, Instant from, Instant to) {
        validateRange(from, to, 1, 0);
        String roomNumber = IdCodec.roomNumberFromRoomId(roomId);
        SensorJdbcRepository.RoomMeta meta = ensureRoomMeta(roomNumber);

        SensorJdbcRepository.StatsAggRow row = repository.getStats(roomNumber, from, to)
                .orElseThrow(() -> new NotFoundException("No data for room in requested period"));

        return new StatsResponse(
                roomId,
                meta.buildingName(),
                meta.roomNumber(),
                new PeriodDto(from.toString(), to.toString()),
                new ParamStatsDto(row.co2Avg(), row.co2Median(), row.co2Min(), row.co2Max(), row.co2PercentInNorm()),
                new ParamStatsDto(row.temperatureAvg(), row.temperatureMedian(), row.temperatureMin(), row.temperatureMax(), row.temperaturePercentInNorm()),
                new ParamStatsDto(row.humidityAvg(), row.humidityMedian(), row.humidityMin(), row.humidityMax(), row.humidityPercentInNorm())
        );
    }

    public PeakHoursResponse getPeakHours(String roomId, Instant from, Instant to) {
        validateRange(from, to, 1, 0);
        String roomNumber = IdCodec.roomNumberFromRoomId(roomId);
        ensureRoomExists(roomNumber);

        List<PeakHourDto> rows = repository.findPeakHours(roomNumber, from, to).stream()
                .map(row -> new PeakHourDto(row.hour(), row.avgCo2()))
                .toList();

        return new PeakHoursResponse(
                roomId,
                new PeriodDto(from.toString(), to.toString()),
                rows
        );
    }

    public CompareResponse compareRooms(List<String> roomIds, Instant from, Instant to) {
        validateRange(from, to, 1, 0);
        if (roomIds == null || roomIds.isEmpty()) {
            throw new BadRequestException("roomIds must not be empty");
        }

        List<String> roomNumbers = roomIds.stream()
                .map(IdCodec::roomNumberFromRoomId)
                .toList();

        List<CompareRoomDto> rows = repository.compareRooms(roomNumbers, from, to).stream()
                .map(row -> new CompareRoomDto(
                        IdCodec.roomIdFromRoomNumber(row.roomNumber()),
                        row.buildingName(),
                        row.roomNumber(),
                        row.co2Avg(),
                        row.co2PercentInNorm(),
                        row.temperatureAvg(),
                        row.humidityAvg()
                ))
                .toList();

        return new CompareResponse(
                new PeriodDto(from.toString(), to.toString()),
                rows
        );
    }

    private void validateRange(Instant from, Instant to, int limit, int offset) {
        if (from == null || to == null) {
            throw new BadRequestException("from and to are required");
        }
        if (from.isAfter(to)) {
            throw new BadRequestException("from must be <= to");
        }
        if (limit <= 0) {
            throw new BadRequestException("limit must be > 0");
        }
        if (offset < 0) {
            throw new BadRequestException("offset must be >= 0");
        }
    }

    private void ensureRoomExists(String roomNumber) {
        if (!repository.roomExists(roomNumber)) {
            throw new NotFoundException("Room not found");
        }
    }

    private SensorJdbcRepository.RoomMeta ensureRoomMeta(String roomNumber) {
        return repository.findRoomMeta(roomNumber)
                .orElseThrow(() -> new NotFoundException("Room not found"));
    }

    private String mapBuildingIdToName(String buildingId) {
        if (buildingId == null || buildingId.isBlank()) {
            return null;
        }

        return repository.findBuildingNames().stream()
                .filter(name -> BuildingIdMapper.toBuildingId(name).equals(buildingId))
                .findFirst()
                .orElse(null);
    }
}
