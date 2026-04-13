package avsbackend.model.api;

public record CompareRoomDto(
        String roomId,
        String buildingName,
        String roomNumber,
        Double co2Avg,
        Double co2PercentInNorm,
        Double temperatureAvg,
        Double humidityAvg
) {}
