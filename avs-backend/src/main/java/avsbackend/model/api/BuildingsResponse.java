package avsbackend.model.api;

import java.util.List;

public record BuildingsResponse(
        List<BuildingDto> buildings
) {
}