package avsbackend.model.api;

import java.util.List;

public record SensorListResponse(
        String period,
        List<SensorListItemDto> sensors
) {
}
