package avsbackend.controller;

import avsbackend.model.api.BuildingsResponse;
import avsbackend.model.api.RoomsResponse;
import avsbackend.service.SensorQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class NavigationController {

    private final SensorQueryService sensorQueryService;

    public NavigationController(SensorQueryService sensorQueryService) {
        this.sensorQueryService = sensorQueryService;
    }

    @GetMapping("/buildings")
    public BuildingsResponse getBuildings() {
        return sensorQueryService.getBuildings();
    }

    @GetMapping("/rooms")
    public RoomsResponse getRooms(@RequestParam(required = false) String buildingId) {
        return sensorQueryService.getRooms(buildingId);
    }
}