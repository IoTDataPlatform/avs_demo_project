package avsbackend.model.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum SensorStatus {
    ONLINE("online"),
    OFFLINE("offline"),
    MALFUNCTIONED("malfunctioned");

    private final String value;

    SensorStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}
