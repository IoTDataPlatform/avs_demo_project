package avsbackend.service;

import avsbackend.config.AppProperties;
import avsbackend.model.api.CurrentReadingResponse;
import avsbackend.model.enums.SensorStatus;
import avsbackend.util.IdCodec;
import avsbackend.util.StatusCalculator;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class RedisCurrentService {

    private final StringRedisTemplate redisTemplate;
    private final AppProperties appProperties;

    public RedisCurrentService(StringRedisTemplate redisTemplate, AppProperties appProperties) {
        this.redisTemplate = redisTemplate;
        this.appProperties = appProperties;
    }

    public Optional<CurrentReadingResponse> getCurrent(String roomId) {
        String roomNumber = IdCodec.roomNumberFromRoomId(roomId);
        String key = appProperties.getRedis().getKeyspace() + ":" + roomNumber;

        Map<Object, Object> raw = redisTemplate.opsForHash().entries(key);
        if (raw == null || raw.isEmpty()) {
            return Optional.empty();
        }

        String sensorId = asString(raw.get("sensorId"));
        String buildingName = asString(raw.get("buildingName"));
        String ts = asString(raw.get("ts"));
        Integer co2 = asInteger(raw.get("co2"));
        Double temperature = asDouble(raw.get("temperature"));
        Double humidity = asDouble(raw.get("humidity"));

        SensorStatus sensorStatus = StatusCalculator.sensorStatus(ts, appProperties);

        return Optional.of(new CurrentReadingResponse(
                sensorId,
                IdCodec.roomIdFromRoomNumber(roomNumber),
                buildingName,
                roomNumber,
                ts,
                co2,
                temperature,
                humidity,
                sensorStatus,
                StatusCalculator.co2Status(co2),
                StatusCalculator.temperatureStatus(temperature),
                StatusCalculator.humidityStatus(humidity)
        ));
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private Integer asInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        return Integer.parseInt(value.toString());
    }

    private Double asDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.doubleValue();
        return Double.parseDouble(value.toString());
    }
}
