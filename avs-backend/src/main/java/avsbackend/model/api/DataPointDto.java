package avsbackend.model.api;

public record DataPointDto(
        String ts,
        Double co2,
        Double temperature,
        Double humidity
) {}
