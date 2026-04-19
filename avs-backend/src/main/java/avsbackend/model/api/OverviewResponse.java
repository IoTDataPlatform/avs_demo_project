package avsbackend.model.api;

public record OverviewResponse(
        GlobalSummaryDto summary,
        Long onlineRoomsCount,
        Long onlineSensorsKeysCount
) {
}