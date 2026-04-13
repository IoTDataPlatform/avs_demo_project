package avsbackend.model.api;

import java.util.List;

public record HistoryResponse(
        String roomId,
        String from,
        String to,
        String interval,
        int limit,
        int offset,
        long total,
        List<DataPointDto> data
) {}
