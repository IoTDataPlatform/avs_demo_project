package avsbackend.util;

import java.util.Map;

public final class RedisValueReader {

    private RedisValueReader() {
    }

    public static String string(Map<String, String> raw, String key) {
        return raw.get(key);
    }

    public static Integer integerValue(Map<String, String> raw, String key) {
        String value = raw.get(key);
        return value == null ? null : Integer.valueOf(value);
    }

    public static Long longValue(Map<String, String> raw, String key) {
        String value = raw.get(key);
        return value == null ? null : Long.valueOf(value);
    }

    public static Double doubleValue(Map<String, String> raw, String key) {
        String value = raw.get(key);
        return value == null ? null : Double.valueOf(value);
    }
}
