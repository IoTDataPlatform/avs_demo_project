package avsbackend.util;

import avsbackend.model.enums.OverallStatus;
import avsbackend.model.enums.ParamStatus;

public final class AirStatusEvaluator {

    private AirStatusEvaluator() {
    }

    public static ParamStatus co2Status(Double value) {
        if (value == null) return ParamStatus.CRITICAL;
        if (value < 600) return ParamStatus.EXCELLENT;
        if (value < 800) return ParamStatus.NORMAL;
        if (value <= 1000) return ParamStatus.WARNING;
        return ParamStatus.CRITICAL;
    }

    public static ParamStatus temperatureStatus(Double value) {
        if (value == null) return ParamStatus.CRITICAL;
        if (value >= 20 && value <= 22) return ParamStatus.EXCELLENT;
        if (value >= 18 && value <= 26) return ParamStatus.NORMAL;
        if (value >= 16 && value <= 28) return ParamStatus.WARNING;
        return ParamStatus.CRITICAL;
    }

    public static ParamStatus humidityStatus(Double value) {
        if (value == null) return ParamStatus.CRITICAL;
        if (value >= 45 && value <= 50) return ParamStatus.EXCELLENT;
        if (value >= 30 && value <= 70) return ParamStatus.NORMAL;
        if (value >= 20 && value <= 80) return ParamStatus.WARNING;
        return ParamStatus.CRITICAL;
    }

    public static OverallStatus overall(ParamStatus co2, ParamStatus temperature, ParamStatus humidity) {
        if (co2 == ParamStatus.EXCELLENT
                && temperature == ParamStatus.EXCELLENT
                && humidity == ParamStatus.EXCELLENT) {
            return OverallStatus.EXCELLENT;
        }
        if (co2 == ParamStatus.CRITICAL
                || temperature == ParamStatus.CRITICAL
                || humidity == ParamStatus.CRITICAL) {
            return OverallStatus.CRITICAL;
        }
        if (co2 == ParamStatus.WARNING
                || temperature == ParamStatus.WARNING
                || humidity == ParamStatus.WARNING) {
            return OverallStatus.WARNING;
        }
        return OverallStatus.NORMAL;
    }
}
