package avsbackend.service;

import avsbackend.config.AppProperties;
import avsbackend.exception.NotFoundException;
import avsbackend.model.api.GlobalSummaryDto;
import avsbackend.model.api.OverviewResponse;
import avsbackend.util.RedisValueReader;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class OverviewService {

    private final RedisReadService redisReadService;
    private final AppProperties appProperties;

    public OverviewService(RedisReadService redisReadService, AppProperties appProperties) {
        this.redisReadService = redisReadService;
        this.appProperties = appProperties;
    }

    public OverviewResponse getOverview() {
        String summaryKey = appProperties.getRedis().getKeyspaces().getGlobalSummary() + ":global";
        Map<String, String> raw = redisReadService.readHash(summaryKey);

        if (raw.isEmpty()) {
            throw new NotFoundException("Global summary not found");
        }

        GlobalSummaryDto summary = new GlobalSummaryDto(
                RedisValueReader.string(raw, "summary_key"),
                RedisValueReader.string(raw, "updated_at"),
                RedisValueReader.longValue(raw, "total_sensors_seen"),
                RedisValueReader.longValue(raw, "online_sensors_count"),
                RedisValueReader.string(raw, "online_sensor_ids_csv"),
                RedisValueReader.longValue(raw, "rooms_co2_warning_count"),
                RedisValueReader.longValue(raw, "rooms_co2_critical_count"),
                RedisValueReader.longValue(raw, "rooms_temperature_warning_count"),
                RedisValueReader.longValue(raw, "rooms_temperature_critical_count"),
                RedisValueReader.longValue(raw, "rooms_humidity_warning_count"),
                RedisValueReader.longValue(raw, "rooms_humidity_critical_count")
        );

        long onlineRoomsCount = redisReadService.countKeysByPrefix(
                appProperties.getRedis().getKeyspaces().getRoomLatest() + ":"
        );
        long onlineSensorsCount = redisReadService.countKeysByPrefix(
                appProperties.getRedis().getKeyspaces().getSensorLatest() + ":"
        );

        return new OverviewResponse(summary, onlineRoomsCount, onlineSensorsCount);
    }
}