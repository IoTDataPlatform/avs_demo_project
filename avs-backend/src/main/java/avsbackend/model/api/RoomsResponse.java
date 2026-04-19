package avsbackend.model.api;

import java.util.List;

public record RoomsResponse(
        List<RoomCardDto> rooms
) {
}