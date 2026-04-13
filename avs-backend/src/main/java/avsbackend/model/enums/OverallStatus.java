package avsbackend.model.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum OverallStatus {
    NORMAL("normal"),
    WARNING("warning"),
    CRITICAL("critical");

    private final String value;

    OverallStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}
