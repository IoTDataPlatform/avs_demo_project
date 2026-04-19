package avsbackend.model.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum OverallStatus {
    NORMAL("normal"),
    WARNING("warning"),
    CRITICAL("critical"),
    EXCELLENT("excellent");

    private final String value;

    OverallStatus(String value) {
        this.value = value;
    }

    public static OverallStatus from(String value) {
        if (value == null) {
            return null;
        }
        for (OverallStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown OverallStatus: " + value);
    }

    @JsonValue
    public String value() {
        return value;
    }
}
