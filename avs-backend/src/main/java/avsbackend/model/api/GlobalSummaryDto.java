package avsbackend.model.api;

public record GlobalSummaryDto(
        String summaryKey,
        String updatedAt,
        Long totalSensorsSeen,
        Long onlineSensorsCount,
        String onlineSensorIdsCsv,
        Long roomsCo2WarningCount,
        Long roomsCo2CriticalCount,
        Long roomsTemperatureWarningCount,
        Long roomsTemperatureCriticalCount,
        Long roomsHumidityWarningCount,
        Long roomsHumidityCriticalCount
) {
}