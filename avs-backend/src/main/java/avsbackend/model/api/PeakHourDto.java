package avsbackend.model.api;

public record PeakHourDto(
        Integer hour,
        Double avgCo2
) {}
