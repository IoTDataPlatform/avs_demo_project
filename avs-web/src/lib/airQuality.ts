import type {
    OverallStatus,
    ParamStatus,
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

