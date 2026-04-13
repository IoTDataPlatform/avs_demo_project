package avsbackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Redis redis = new Redis();
    private final Sensor sensor = new Sensor();

    public Redis getRedis() {
        return redis;
    }

    public Sensor getSensor() {
        return sensor;
    }

    public static class Redis {
        private String keyspace = "room-current";

        public String getKeyspace() {
            return keyspace;
        }

        public void setKeyspace(String keyspace) {
            this.keyspace = keyspace;
        }
    }

    public static class Sensor {
        private Duration offlineAfter = Duration.ofMinutes(2);

        public Duration getOfflineAfter() {
            return offlineAfter;
        }

        public void setOfflineAfter(Duration offlineAfter) {
            this.offlineAfter = offlineAfter;
        }
    }
}
