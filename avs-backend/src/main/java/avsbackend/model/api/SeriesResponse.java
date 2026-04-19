package avsbackend.model.api;

import java.util.List;

public record SeriesResponse(
        String entityType,
        String entityId,
        String from,
        String to,
        String step,
        List<SeriesPointDto> points
) {
}