package avsbackend.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RedisReadService {

    private final StringRedisTemplate redisTemplate;

    public RedisReadService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Map<String, String> readHash(String key) {
        Map<Object, Object> raw = redisTemplate.opsForHash().entries(key);
        if (raw == null || raw.isEmpty()) {
            return Map.of();
        }

        Map<String, String> result = new HashMap<>();
        raw.forEach((k, v) -> result.put(
                k == null ? null : k.toString(),
                v == null ? null : v.toString()
        ));
        return result;
    }

    public List<Map<String, String>> readHashesByPrefix(String prefix) {
        Set<String> keys = redisTemplate.keys(prefix + "*");
        if (keys == null || keys.isEmpty()) {
            return List.of();
        }

        return keys.stream()
                .sorted()
                .map(this::readHash)
                .filter(map -> !map.isEmpty())
                .collect(Collectors.toList());
    }

    public long countKeysByPrefix(String prefix) {
        Set<String> keys = redisTemplate.keys(prefix + "*");
        return keys == null ? 0 : keys.size();
    }
}