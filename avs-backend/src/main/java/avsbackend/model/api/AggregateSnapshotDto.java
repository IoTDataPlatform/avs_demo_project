package avsbackend.model.api;

import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.ParamStatus;

public record AggregateSnapshotDto(
        String period,
        String roomKey,
        String buildingName,
        String roomNumber,
        String windowStart,
        String windowEnd,
        Double co2Avg,
        Double temperatureAvg,
        Double humidityAvg,
        ParamStatus co2Status,
        ParamStatus temperatureStatus,
        ParamStatus humidityStatus,
        OverallStatus overallAirStatus
) {
}