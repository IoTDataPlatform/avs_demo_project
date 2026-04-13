package avsbackend.model.api;

import java.util.List;

public record PeakHoursResponse(
        String roomId,
        PeriodDto period,
        List<PeakHourDto> hourlyAvgCo2
) {}
