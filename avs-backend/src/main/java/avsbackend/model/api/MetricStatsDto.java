package avsbackend.model.api;

public record MetricStatsDto(
        Double avg,
        Double median,
        Double min,
        Double max,
        Double percentInNorm
) {
}