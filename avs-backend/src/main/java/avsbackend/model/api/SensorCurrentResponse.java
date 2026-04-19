package avsbackend.model.api;

import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.ParamStatus;

public record SensorCurrentResponse(
        String sensorId,
        String roomKey,
        String buildingName,
        String roomNumber,
        String ts,
        Integer co2,
        Double temperature,
        Double humidity,
        ParamStatus co2Status,
        ParamStatus temperatureStatus,
        ParamStatus humidityStatus,
        OverallStatus overallAirStatus
) {
}