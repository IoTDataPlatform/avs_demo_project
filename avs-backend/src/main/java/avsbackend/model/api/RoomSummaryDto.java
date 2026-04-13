package avsbackend.model.api;

import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.SensorStatus;

public record RoomSummaryDto(
        String id,
        String buildingId,
        String buildingName,
        String roomNumber,
        String sensorId,
        SensorStatus sensorStatus,
        String lastTs,
        Integer co2,
        Double temperature,
        Double humidity,
        OverallStatus overallStatus
) {}