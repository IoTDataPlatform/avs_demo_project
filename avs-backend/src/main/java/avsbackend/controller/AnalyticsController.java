package avsbackend.controller;

import avsbackend.model.api.CompareResponse;
import avsbackend.model.api.PeakHoursResponse;
import avsbackend.service.SensorQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final SensorQueryService sensorQueryService;

    public AnalyticsController(SensorQueryService sensorQueryService) {
        this.sensorQueryService = sensorQueryService;
    }

    @GetMapping("/peak-hours")
    public PeakHoursResponse getPeakHours(
            @RequestParam String roomId,
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        return sensorQueryService.getPeakHours(roomId, from, to);
    }

    @GetMapping("/compare")
    public CompareResponse compareRooms(
            @RequestParam String roomIds,
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        List<String> parsed = Arrays.stream(roomIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
        return sensorQueryService.compareRooms(parsed, from, to);
    }
}
