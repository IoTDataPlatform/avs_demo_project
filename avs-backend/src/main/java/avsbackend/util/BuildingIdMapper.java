package avsbackend.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;

public final class BuildingIdMapper {

    private static final Map<String, String> KNOWN = Map.of(
            "Главный корпус", "bld_main",
            "Лекционный", "bld_lab",
            "Корпус поточных аудиторий", "bld_kpf",
            "Новый", "bld_new"
    );

    private BuildingIdMapper() {
    }

    public static String toBuildingId(String buildingName) {
        if (buildingName == null || buildingName.isBlank()) {
            return "bld_unknown";
        }
        return KNOWN.getOrDefault(buildingName, "bld_unknown");
    }
}
