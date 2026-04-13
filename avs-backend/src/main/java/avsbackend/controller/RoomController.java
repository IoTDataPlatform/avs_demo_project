package avsbackend.controller;

import avsbackend.exception.NotFoundException;
import avsbackend.model.api.CurrentReadingResponse;
import avsbackend.model.api.HistoryResponse;
import avsbackend.model.api.StatsResponse;
import avsbackend.service.RedisCurrentService;
import avsbackend.service.SensorQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RedisCurrentService redisCurrentService;
    private final SensorQueryService sensorQueryService;

    public RoomController(RedisCurrentService redisCurrentService, SensorQueryService sensorQueryService) {
        this.redisCurrentService = redisCurrentService;
        this.sensorQueryService = sensorQueryService;
    }

    @GetMapping("/{roomId}/current")
    public CurrentReadingResponse getCurrent(@PathVariable String roomId) {
        return redisCurrentService.getCurrent(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));
    }

    @GetMapping("/{roomId}/history")
    public HistoryResponse getHistory(
            @PathVariable String roomId,
            @RequestParam Instant from,
            @RequestParam Instant to,
            @RequestParam(defaultValue = "1h") String interval,
            @RequestParam(defaultValue = "1000") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        return sensorQueryService.getRoomHistory(roomId, from, to, interval, limit, offset);
    }

    @GetMapping("/{roomId}/stats")
    public StatsResponse getStats(
            @PathVariable String roomId,
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        return sensorQueryService.getRoomStats(roomId, from, to);
    }
}
