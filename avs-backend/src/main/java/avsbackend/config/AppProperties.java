package avsbackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Redis redis = new Redis();

    public Redis getRedis() {
        return redis;
    }

    public static class Redis {
        private final Keyspaces keyspaces = new Keyspaces();

        public Keyspaces getKeyspaces() {
            return keyspaces;
        }
    }

    public static class Keyspaces {
        private String globalSummary = "avs:summary";
        private String roomLatest = "avs:room:latest";
        private String roomAvg1m = "avs:room:avg:1m";
        private String roomAvg1h = "avs:room:avg:1h";
        private String roomAvg1d = "avs:room:avg:1d";
        private String sensorLatest = "avs:sensor:latest";

        public String getGlobalSummary() {
            return globalSummary;
        }

        public void setGlobalSummary(String globalSummary) {
            this.globalSummary = globalSummary;
        }

        public String getRoomLatest() {
            return roomLatest;
        }

        public void setRoomLatest(String roomLatest) {
            this.roomLatest = roomLatest;
        }

        public String getRoomAvg1m() {
            return roomAvg1m;
        }

        public void setRoomAvg1m(String roomAvg1m) {
            this.roomAvg1m = roomAvg1m;
        }

        public String getRoomAvg1h() {
            return roomAvg1h;
        }

        public void setRoomAvg1h(String roomAvg1h) {
            this.roomAvg1h = roomAvg1h;
        }

        public String getRoomAvg1d() {
            return roomAvg1d;
        }

        public void setRoomAvg1d(String roomAvg1d) {
            this.roomAvg1d = roomAvg1d;
        }

        public String getSensorLatest() {
            return sensorLatest;
        }

        public void setSensorLatest(String sensorLatest) {
            this.sensorLatest = sensorLatest;
        }
    }
}