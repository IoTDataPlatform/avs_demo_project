package avsbackend.model.api;

public record StatsResponse(
        String roomId,
        String buildingName,
        String roomNumber,
        PeriodDto period,
        ParamStatsDto co2,
        ParamStatsDto temperature,
        ParamStatsDto humidity
) {}
