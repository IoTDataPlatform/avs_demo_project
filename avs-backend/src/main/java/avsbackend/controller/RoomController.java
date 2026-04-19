package avsbackend.controller;

import avsbackend.model.api.RoomAggregatesResponse;
import avsbackend.model.api.RoomCurrentResponse;
import avsbackend.model.api.SeriesResponse;
import avsbackend.model.api.StatsResponse;
import avsbackend.service.RoomService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping("/{roomKey}/current")
    public RoomCurrentResponse getCurrent(@PathVariable String roomKey) {
        return roomService.getCurrent(roomKey);
    }

    @GetMapping("/{roomKey}/aggregates")
    public RoomAggregatesResponse getAggregates(@PathVariable String roomKey) {
        return roomService.getAggregates(roomKey);
    }

    @GetMapping("/{roomKey}/series")
    public SeriesResponse getSeries(
            @PathVariable String roomKey,
            @RequestParam Instant from,
            @RequestParam Instant to,
            @RequestParam(defaultValue = "hour") String step
    ) {
        return roomService.getSeries(roomKey, from, to, step);
    }

    @GetMapping("/{roomKey}/stats")
    public StatsResponse getStats(
            @PathVariable String roomKey,
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        return roomService.getStats(roomKey, from, to);
    }
}
