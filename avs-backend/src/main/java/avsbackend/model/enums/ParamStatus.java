package avsbackend.model.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ParamStatus {
    NORMAL("normal"),
    WARNING("warning"),
    CRITICAL("critical");

    private final String value;

    ParamStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}