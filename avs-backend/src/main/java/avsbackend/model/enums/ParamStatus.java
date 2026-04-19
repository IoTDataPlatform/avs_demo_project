package avsbackend.model.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ParamStatus {
    NORMAL("normal"),
    WARNING("warning"),
    CRITICAL("critical"),
    EXCELLENT("excellent");

    private final String value;

    ParamStatus(String value) {
        this.value = value;
    }

    public static ParamStatus from(String value) {
        if (value == null) {
            return null;
        }
        for (ParamStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown ParamStatus: " + value);
    }

    @JsonValue
    public String value() {
        return value;
    }
}
