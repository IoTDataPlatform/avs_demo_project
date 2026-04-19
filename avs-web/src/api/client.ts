import type {
    BuildingsResponse,
    OverviewResponse,
    RoomAggregatesResponse,
    RoomCurrentResponse,
    RoomsResponse,
    SensorsResponse,
    SensorCurrentResponse,
    SeriesResponse,
    SeriesStep,
    StatsResponse,
} from "@/api/types"

const API_BASE_URL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ??
    "http://localhost:8084/api"

export class ApiError extends Error {
    status: number
    payload?: unknown

    constructor(message: string, status: number, payload?: unknown) {
        super(message)
        this.name = "ApiError"
        this.status = status
        this.payload = payload
    }
}

function buildUrl(path: string, query?: Record<string, string | number | undefined | null>) {
    const url = new URL(`${API_BASE_URL}${path}`)

    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null && value !== "") {
                url.searchParams.set(key, String(value))
            }
        }
    }

    return url.toString()
}

async function fetchJson<T>(
    path: string,
    query?: Record<string, string | number | undefined | null>,
): Promise<T> {
    const response = await fetch(buildUrl(path, query), {
        headers: { Accept: "application/json" },
    })

    const text = await response.text()
    const payload = text ? JSON.parse(text) : null

    if (!response.ok) {
        const message =
            payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
                ? payload.message
                : `Request failed with status ${response.status}`

        throw new ApiError(message, response.status, payload)
    }

    return payload as T
}

export function encodeRoomKey(roomKey: string) {
    return encodeURIComponent(roomKey)
}

export async function getOverview(): Promise<OverviewResponse> {
    return fetchJson("/overview")
}

export async function getBuildings(): Promise<BuildingsResponse> {
    return fetchJson("/buildings")
}

export async function getRooms(buildingId?: string): Promise<RoomsResponse> {
    return fetchJson("/rooms", { buildingId })
}

export async function getRoomSensors(roomKey: string): Promise<SensorsResponse> {
    return fetchJson(`/room-sensors`, { roomKey })
}

export async function getRoomCurrent(roomKey: string): Promise<RoomCurrentResponse> {
    return fetchJson(`/room-current`, { roomKey })
}

export async function getRoomAggregates(roomKey: string): Promise<RoomAggregatesResponse> {
    return fetchJson(`/room-aggregates`, { roomKey })
}

export async function getRoomSeries(
    roomKey: string,
    from: string,
    to: string,
    step: SeriesStep,
): Promise<SeriesResponse> {
    return fetchJson(`/room-series`, {
        roomKey,
        from,
        to,
        step,
    })
}

export async function getRoomStats(
    roomKey: string,
    from: string,
    to: string,
): Promise<StatsResponse> {
    return fetchJson(`/room-stats`, {
        roomKey,
        from,
        to,
    })
}

export async function getSensorCurrent(sensorId: string): Promise<SensorCurrentResponse> {
    return fetchJson(`/sensors/${encodeURIComponent(sensorId)}/current`)
}

export async function getSensorSeries(
    sensorId: string,
    from: string,
    to: string,
    step: SeriesStep,
): Promise<SeriesResponse> {
    return fetchJson(`/sensors/${encodeURIComponent(sensorId)}/series`, { from, to, step })
}

export async function getSensorStats(
    sensorId: string,
    from: string,
    to: string,
): Promise<StatsResponse> {
    return fetchJson(`/sensors/${encodeURIComponent(sensorId)}/stats`, { from, to })
}