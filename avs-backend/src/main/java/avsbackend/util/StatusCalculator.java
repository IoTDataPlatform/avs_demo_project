package avsbackend.util;

import avsbackend.config.AppProperties;
import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.ParamStatus;
import avsbackend.model.enums.SensorStatus;

import java.time.Instant;
import java.time.format.DateTimeParseException;

public final class StatusCalculator {

    private StatusCalculator() {
    }

    public static SensorStatus sensorStatus(String ts, AppProperties appProperties) {
        if (ts == null || ts.isBlank()) {
            return SensorStatus.OFFLINE;
        }
        try {
            Instant readingTime = Instant.parse(ts);
            Instant offlineThreshold = Instant.now().minus(appProperties.getSensor().getOfflineAfter());
            return readingTime.isBefore(offlineThreshold) ? SensorStatus.OFFLINE : SensorStatus.ONLINE;
        } catch (DateTimeParseException e) {
            return SensorStatus.MALFUNCTIONED;
        }
    }

    public static ParamStatus co2Status(Number value) {
        if (value == null) return ParamStatus.CRITICAL;
        double v = value.doubleValue();
        if (v > 1000) return ParamStatus.CRITICAL;
        if (v >= 800) return ParamStatus.WARNING;
        return ParamStatus.NORMAL;
    }

    public static ParamStatus temperatureStatus(Number value) {
        if (value == null) return ParamStatus.CRITICAL;
        double v = value.doubleValue();
        if (v < 16 || v > 28) return ParamStatus.CRITICAL;
        if ((v >= 16 && v < 18) || (v > 26 && v <= 28)) return ParamStatus.WARNING;
        return ParamStatus.NORMAL;
    }

    public static ParamStatus humidityStatus(Number value) {
        if (value == null) return ParamStatus.CRITICAL;
        double v = value.doubleValue();
        if (v < 20 || v > 80) return ParamStatus.CRITICAL;
        if ((v >= 20 && v < 30) || (v > 70 && v <= 80)) return ParamStatus.WARNING;
        return ParamStatus.NORMAL;
    }

    public static OverallStatus overallStatus(Number co2, Number temperature, Number humidity) {
        ParamStatus c = co2Status(co2);
        ParamStatus t = temperatureStatus(temperature);
        ParamStatus h = humidityStatus(humidity);

        if (c == ParamStatus.CRITICAL || t == ParamStatus.CRITICAL || h == ParamStatus.CRITICAL) {
            return OverallStatus.CRITICAL;
        }
        if (c == ParamStatus.WARNING || t == ParamStatus.WARNING || h == ParamStatus.WARNING) {
            return OverallStatus.WARNING;
        }
        return OverallStatus.NORMAL;
    }

    public static double percentInNorm(String metric, Number value) {
        if (value == null) return 0d;
        double v = value.doubleValue();
        return switch (metric) {
            case "co2" -> v < 800 ? 100d : 0d;
            case "temperature" -> (v >= 18 && v <= 26) ? 100d : 0d;
            case "humidity" -> (v >= 30 && v <= 70) ? 100d : 0d;
            default -> 0d;
        };
    }
}
