package avsbackend.model.api;

import java.util.List;

public record CompareResponse(
        PeriodDto period,
        List<CompareRoomDto> rooms
) {}
