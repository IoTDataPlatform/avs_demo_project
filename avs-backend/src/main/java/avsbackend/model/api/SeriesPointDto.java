package avsbackend.model.api;

public record SeriesPointDto(
        String bucket,
        Double co2Avg,
        Double temperatureAvg,
        Double humidityAvg
) {
}