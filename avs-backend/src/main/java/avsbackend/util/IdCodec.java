package avsbackend.util;

public final class IdCodec {

    private IdCodec() {
    }

    public static String roomNumberFromRoomId(String roomId) {
        if (roomId == null || roomId.isBlank()) {
            throw new IllegalArgumentException("roomId must not be blank");
        }
        String trimmed = roomId.trim();
        return trimmed.startsWith("room_") ? trimmed.substring("room_".length()) : trimmed;
    }

    public static String roomIdFromRoomNumber(String roomNumber) {
        return "room_" + roomNumber;
    }
}
