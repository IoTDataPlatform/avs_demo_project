package avsbackend.controller;

import avsbackend.model.api.SensorCurrentResponse;
import avsbackend.model.api.SeriesResponse;
import avsbackend.model.api.StatsResponse;
import avsbackend.service.SensorService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/sensors")
public class SensorController {

    private final SensorService sensorService;

    public SensorController(SensorService sensorService) {
        this.sensorService = sensorService;
    }

    @GetMapping("/{sensorId}/current")
    public SensorCurrentResponse getCurrent(@PathVariable String sensorId) {
        return sensorService.getCurrent(sensorId);
    }

    @GetMapping("/{sensorId}/series")
    public SeriesResponse getSeries(
            @PathVariable String sensorId,
            @RequestParam Instant from,
            @RequestParam Instant to,
            @RequestParam(defaultValue = "hour") String step
    ) {
        return sensorService.getSeries(sensorId, from, to, step);
    }

    @GetMapping("/{sensorId}/stats")
    public StatsResponse getStats(
            @PathVariable String sensorId,
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        return sensorService.getStats(sensorId, from, to);
    }
}