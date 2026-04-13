package avsbackend.model.api;

public record ParamStatsDto(
        Double avg,
        Double median,
        Double min,
        Double max,
        Double percentInNorm
) {}
