package avsbackend.model.api;

import java.util.List;

public record SensorsResponse(
        String roomKey,
        String buildingName,
        String roomNumber,
        List<SensorDto> sensors
) {
}