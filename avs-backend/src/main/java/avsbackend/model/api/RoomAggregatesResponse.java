package avsbackend.model.api;

public record RoomAggregatesResponse(
        String roomKey,
        AggregateSnapshotDto avg1m,
        AggregateSnapshotDto avg1h,
        AggregateSnapshotDto avg1d
) {
}