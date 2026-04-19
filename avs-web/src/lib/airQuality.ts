import type {
    MetricStatsDto,
    OverallStatus,
    ParamStatus,
    RoomAggregatesResponse,
    RoomCardDto,
    RoomStatusSource,
    SensorCurrentResponse,
    SensorListItem,
    SnapshotPeriod,
    StatsResponse,
} from "@/api/types"

export const AIR_ORDER: OverallStatus[] = ["excellent", "normal", "warning", "critical"]

export function co2Status(value: number | null | undefined): ParamStatus {
    if (value == null) return "critical"
    if (value < 600) return "excellent"
    if (value < 800) return "normal"
    if (value <= 1000) return "warning"
    return "critical"
}

export function temperatureStatus(value: number | null | undefined): ParamStatus {
    if (value == null) return "critical"
    if (value >= 20 && value <= 22) return "excellent"
    if (value >= 18 && value <= 26) return "normal"
    if (value >= 16 && value <= 28) return "warning"
    return "critical"
}

export function humidityStatus(value: number | null | undefined): ParamStatus {
    if (value == null) return "critical"
    if (value >= 45 && value <= 50) return "excellent"
    if (value >= 30 && value <= 70) return "normal"
    if (value >= 20 && value <= 80) return "warning"
    return "critical"
}

export function overallAirStatus(
    co2: number | null | undefined,
    temperature: number | null | undefined,
    humidity: number | null | undefined,
): OverallStatus {
    const c = co2Status(co2)
    const t = temperatureStatus(temperature)
    const h = humidityStatus(humidity)

    if (c === "excellent" && t === "excellent" && h === "excellent") return "excellent"
    if (c === "critical" || t === "critical" || h === "critical") return "critical"
    if (c === "warning" || t === "warning" || h === "warning") return "warning"
    return "normal"
}

export function formatStatusLabel(status: OverallStatus | ParamStatus) {
    switch (status) {
        case "excellent":
            return "Отлично"
        case "normal":
            return "Норма"
        case "warning":
            return "Warning"
        case "critical":
            return "Плохой воздух"
    }
}

export function statusColor(status: OverallStatus | ParamStatus) {
    switch (status) {
        case "excellent":
            return "#10b981"
        case "normal":
            return "#6366f1"
        case "warning":
            return "#f59e0b"
        case "critical":
            return "#ef4444"
    }
}

export function countStatuses(items: Array<{ overallAirStatus: OverallStatus }>) {
    const counts: Record<OverallStatus, number> = {
        excellent: 0,
        normal: 0,
        warning: 0,
        critical: 0,
    }

    for (const item of items) counts[item.overallAirStatus] += 1
    return counts
}

export function asRoomStatusSource(room: RoomCardDto): RoomStatusSource {
    return {
        roomKey: room.roomKey,
        buildingId: room.buildingId,
        buildingName: room.buildingName,
        roomNumber: room.roomNumber,
        sensorId: room.sensorId,
        ts: room.ts,
        co2: room.co2,
        temperature: room.temperature,
        humidity: room.humidity,
        co2Status: room.co2Status,
        temperatureStatus: room.temperatureStatus,
        humidityStatus: room.humidityStatus,
        overallAirStatus: room.overallAirStatus,
    }
}

export function aggregateRoomStatus(
    base: RoomCardDto,
    aggregate: RoomAggregatesResponse,
    period: Exclude<SnapshotPeriod, "latest">,
): RoomStatusSource {
    const snap =
        period === "1m" ? aggregate.avg1m :
            period === "1h" ? aggregate.avg1h :
                aggregate.avg1d

    if (!snap) return asRoomStatusSource(base)

    return {
        roomKey: snap.roomKey,
        buildingId: base.buildingId,
        buildingName: snap.buildingName,
        roomNumber: snap.roomNumber,
        sensorId: base.sensorId,
        ts: snap.windowEnd,
        co2: snap.co2Avg,
        temperature: snap.temperatureAvg,
        humidity: snap.humidityAvg,
        co2Status: snap.co2Status,
        temperatureStatus: snap.temperatureStatus,
        humidityStatus: snap.humidityStatus,
        overallAirStatus: snap.overallAirStatus,
    }
}

export function asSensorListItem(current: SensorCurrentResponse): SensorListItem {
    return {
        sensorId: current.sensorId,
        roomKey: current.roomKey,
        buildingName: current.buildingName,
        roomNumber: current.roomNumber,
        ts: current.ts,
        co2: current.co2,
        temperature: current.temperature,
        humidity: current.humidity,
        co2Status: current.co2Status,
        temperatureStatus: current.temperatureStatus,
        humidityStatus: current.humidityStatus,
        overallAirStatus: current.overallAirStatus,
    }
}

function metricAvg(metric: MetricStatsDto) {
    return metric.avg
}

export function sensorFromStatsBase(
    sensorId: string,
    roomKey: string,
    buildingName: string,
    roomNumber: string,
    stats: StatsResponse,
): SensorListItem {
    const co2 = metricAvg(stats.co2)
    const temperature = metricAvg(stats.temperature)
    const humidity = metricAvg(stats.humidity)

    return {
        sensorId,
        roomKey,
        buildingName,
        roomNumber,
        ts: stats.period.to,
        co2,
        temperature,
        humidity,
        co2Status: co2Status(co2),
        temperatureStatus: temperatureStatus(temperature),
        humidityStatus: humidityStatus(humidity),
        overallAirStatus: overallAirStatus(co2, temperature, humidity),
    }
}