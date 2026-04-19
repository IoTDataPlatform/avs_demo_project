package avsbackend.util;

import java.util.Map;
import java.util.Optional;

public final class BuildingIdMapper {

    private static final Map<String, String> KNOWN = Map.ofEntries(
            Map.entry("Главный корпус", "bld_main"),
            Map.entry("Main", "bld_main"),

            Map.entry("Аудиторный корпус", "bld_auditory"),
            Map.entry("Auditory", "bld_auditory"),

            Map.entry("Учебно-лабораторный корпус", "bld_edu_lab"),
            Map.entry("Educational_Laboratory", "bld_edu_lab"),

            Map.entry("Учебный корпус №1", "bld_edu_1"),
            Map.entry("Educational_1", "bld_edu_1"),

            Map.entry("Ректорат", "bld_rectorate"),
            Map.entry("Rectorate", "bld_rectorate")
    );

    private BuildingIdMapper() {
    }

    public static String toBuildingId(String buildingName) {
        if (buildingName == null || buildingName.isBlank()) {
            return "bld_unknown";
        }
        return KNOWN.getOrDefault(buildingName, "bld_unknown");
    }

    public static Optional<String> toBuildingName(String buildingId) {
        return KNOWN.entrySet().stream()
                .filter(e -> e.getValue().equals(buildingId))
                .map(Map.Entry::getKey)
                .findFirst();
    }
}