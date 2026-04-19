package avsbackend.util;

public final class RoomKeyCodec {

    private RoomKeyCodec() {
    }

    public static DecodedRoomKey decode(String roomKey) {
        if (roomKey == null || roomKey.isBlank()) {
            throw new IllegalArgumentException("roomKey must not be blank");
        }

        int idx = roomKey.indexOf('|');
        if (idx <= 0 || idx == roomKey.length() - 1) {
            throw new IllegalArgumentException("roomKey must have format '<building_name>|<room_number>'");
        }

        String buildingName = roomKey.substring(0, idx);
        String roomNumber = roomKey.substring(idx + 1);

        return new DecodedRoomKey(buildingName, roomNumber);
    }

    public record DecodedRoomKey(String buildingName, String roomNumber) {
    }
}
