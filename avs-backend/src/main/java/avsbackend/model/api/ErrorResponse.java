package avsbackend.model.api;

public record ErrorResponse(
        String error,
        String message
) {
}