package avsbackend.model.api;

import java.util.List;

public record RoomsResponse(
        List<RoomSummaryDto> rooms
) {}
