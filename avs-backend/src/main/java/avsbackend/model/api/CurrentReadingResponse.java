package avsbackend.model.api;

import avsbackend.model.enums.ParamStatus;
import avsbackend.model.enums.SensorStatus;

public record CurrentReadingResponse(
        String sensorId,
        String roomId,
        String buildingName,
        String roomNumber,
        String ts,
        Integer co2,
        Double temperature,
        Double humidity,
        SensorStatus sensorStatus,
        ParamStatus co2Status,
        ParamStatus temperatureStatus,
        ParamStatus humidityStatus
) {}
