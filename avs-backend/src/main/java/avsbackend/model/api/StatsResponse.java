package avsbackend.model.api;

import avsbackend.repository.SensorJdbcRepository;

public record StatsResponse(
        String entityType,
        String entityId,
        String buildingName,
        String roomNumber,
        PeriodDto period,
        MetricStatsDto co2,
        MetricStatsDto temperature,
        MetricStatsDto humidity
) {
    public static StatsResponse forRoom(
            String roomKey,
            String buildingName,
            String roomNumber,
            String from,
            String to,
            SensorJdbcRepository.StatsAggRow row
    ) {
        return new StatsResponse(
                "room",
                roomKey,
                buildingName,
                roomNumber,
                new PeriodDto(from, to),
                new MetricStatsDto(row.co2Avg(), row.co2Median(), row.co2Min(), row.co2Max(), row.co2PercentInNorm()),
                new MetricStatsDto(row.temperatureAvg(), row.temperatureMedian(), row.temperatureMin(), row.temperatureMax(), row.temperaturePercentInNorm()),
                new MetricStatsDto(row.humidityAvg(), row.humidityMedian(), row.humidityMin(), row.humidityMax(), row.humidityPercentInNorm())
        );
    }

    public static StatsResponse forSensor(
            String sensorId,
            String from,
            String to,
            SensorJdbcRepository.StatsAggRow row
    ) {
        return new StatsResponse(
                "sensor",
                sensorId,
                null,
                null,
                new PeriodDto(from, to),
                new MetricStatsDto(row.co2Avg(), row.co2Median(), row.co2Min(), row.co2Max(), row.co2PercentInNorm()),
                new MetricStatsDto(row.temperatureAvg(), row.temperatureMedian(), row.temperatureMin(), row.temperatureMax(), row.temperaturePercentInNorm()),
                new MetricStatsDto(row.humidityAvg(), row.humidityMedian(), row.humidityMin(), row.humidityMax(), row.humidityPercentInNorm())
        );
    }
}