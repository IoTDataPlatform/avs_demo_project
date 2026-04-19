package avsbackend.controller;

import avsbackend.model.api.BuildingsResponse;
import avsbackend.model.api.RoomsResponse;
import avsbackend.model.api.SensorsResponse;
import avsbackend.service.DirectoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DirectoryController {

    private final DirectoryService directoryService;

    public DirectoryController(DirectoryService directoryService) {
        this.directoryService = directoryService;
    }

    @GetMapping("/buildings")
    public BuildingsResponse getBuildings() {
        return directoryService.getBuildings();
    }

    @GetMapping("/rooms")
    public RoomsResponse getRooms(@RequestParam(required = false) String buildingId) {
        return directoryService.getRooms(buildingId);
    }

    @GetMapping("/rooms/{roomKey}/sensors")
    public SensorsResponse getRoomSensors(@PathVariable String roomKey) {
        return directoryService.getRoomSensors(roomKey);
    }
}
