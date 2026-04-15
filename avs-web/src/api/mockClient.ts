import type {
  CurrentReadingResponse,
  HistoryInterval,
  HistoryResponse,
  ParamStatus,
  PeakHoursResponse,
  RoomsResponse,
  StatsResponse,
} from "@/api/types"

const MOCK_DELAY_MS = 180

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), MOCK_DELAY_MS)
  })
}

const ROOM_META: Record<
  string,
  { buildingName: string; roomNumber: string; sensorId: string; buildingId: string }
> = {
  room_2128: {
    buildingId: "bld_main",
    buildingName: "Главный корпус",
    roomNumber: "2128",
    sensorId: "sensor_75",
  },
  room_2123: {
    buildingId: "bld_main",
    buildingName: "Главный корпус",
    roomNumber: "2123",
    sensorId: "sensor_12",
  },
  room_lab_101: {
    buildingId: "bld_lab",
    buildingName: "Лабораторный корпус",
    roomNumber: "101",
    sensorId: "sensor_lab_01",
  },
}

function hashRoom(roomId: string): number {
  let h = 0
  for (let i = 0; i < roomId.length; i++) {
    h = (Math.imul(31, h) + roomId.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function co2Status(co2: number): ParamStatus {
  if (co2 < 800) return "normal"
  if (co2 <= 1000) return "warning"
  return "critical"
}

function temperatureStatus(t: number): ParamStatus {
  if (t >= 18 && t <= 26) return "normal"
  if ((t >= 16 && t < 18) || (t > 26 && t <= 28)) return "warning"
  return "critical"
}

function humidityStatus(h: number): ParamStatus {
  if (h >= 30 && h <= 70) return "normal"
  if ((h >= 20 && h < 30) || (h > 70 && h <= 80)) return "warning"
  return "critical"
}

/** Заглушка: `GET /rooms/{roomId}/current` */
export async function fetchRoomCurrentMock(roomId: string): Promise<CurrentReadingResponse | null> {
  const meta = ROOM_META[roomId]
  if (!meta) return delay(null)

  const seed = hashRoom(roomId)
  const t = Date.now() / 5000
  const baseCo2 = 400 + (seed % 500) + Math.sin(t + seed) * 120
  const co2 = Math.round(Math.max(350, Math.min(1250, baseCo2)))
  const temperature = Number(
    (20 + Math.sin(t * 0.7 + seed) * 4 + (seed % 7) * 0.1).toFixed(1),
  )
  const humidity = Number((55 + Math.cos(t * 0.5) * 12).toFixed(1))

  return delay({
    sensorId: meta.sensorId,
    roomId,
    buildingName: meta.buildingName,
    roomNumber: meta.roomNumber,
    ts: new Date().toISOString(),
    co2,
    temperature,
    humidity,
    sensorStatus: "online",
    co2Status: co2Status(co2),
    temperatureStatus: temperatureStatus(temperature),
    humidityStatus: humidityStatus(humidity),
  })
}

function stepMsForInterval(interval: HistoryInterval, fromMs: number, toMs: number): number {
  const span = toMs - fromMs
  if (interval === "raw") return Math.max(60_000, Math.floor(span / 200))
  if (interval === "1h") return 3_600_000
  return 86_400_000
}

/** Заглушка: `GET /rooms/{roomId}/history` */
export async function fetchRoomHistoryMock(
  roomId: string,
  fromIso: string,
  toIso: string,
  interval: HistoryInterval,
  limit = 1000,
): Promise<HistoryResponse | null> {
  const meta = ROOM_META[roomId]
  if (!meta) return delay(null)

  const fromMs = new Date(fromIso).getTime()
  const toMs = new Date(toIso).getTime()
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
    return delay({
      roomId,
      from: fromIso,
      to: toIso,
      interval,
      limit,
      offset: 0,
      total: 0,
      data: [],
    })
  }

  const seed = hashRoom(roomId)
  const step = stepMsForInterval(interval, fromMs, toMs)
  const data: HistoryResponse["data"] = []
  for (let ms = fromMs; ms <= toMs && data.length < limit; ms += step) {
    const phase = ms / 3_600_000
    const co2 = 480 + (seed % 200) + Math.sin(phase + seed) * 180
    const temperature = 21 + Math.sin(phase * 0.8) * 3
    const humidity = 52 + Math.cos(phase * 0.6) * 15
    data.push({
      ts: new Date(ms).toISOString(),
      co2: Number(co2.toFixed(1)),
      temperature: Number(temperature.toFixed(1)),
      humidity: Number(humidity.toFixed(1)),
    })
  }

  return delay({
    roomId,
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    interval,
    limit,
    offset: 0,
    total: data.length,
    data,
  })
}

function mixFromSeed(seed: number): { a: number; b: number; c: number } {
  const u = seed >>> 0
  return {
    a: u % 1000,
    b: Math.floor(u / 1000) % 1000,
    c: Math.floor(u / 1_000_000) % 1000,
  }
}

function mockParamStats(seed: number, kind: "co2" | "temperature" | "humidity"): StatsResponse["co2"] {
  const { a, b, c } = mixFromSeed(seed)
  if (kind === "co2") {
    const base = 480 + (a % 180)
    const spread = 140 + (b % 80)
    return {
      avg: Number((base + (c % 50) * 0.2).toFixed(1)),
      median: Number((base - spread * 0.08).toFixed(1)),
      min: Number((base - spread * 0.45).toFixed(1)),
      max: Number((base + spread * 0.5).toFixed(1)),
      percentInNorm: Number((68 + (b % 22)).toFixed(1)),
    }
  }
  if (kind === "temperature") {
    const base = 20 + (a % 80) * 0.08
    const spread = 4 + (b % 20) * 0.1
    return {
      avg: Number((base + (c % 30) * 0.02).toFixed(1)),
      median: Number((base - spread * 0.1).toFixed(1)),
      min: Number((base - spread * 0.5).toFixed(1)),
      max: Number((base + spread * 0.55).toFixed(1)),
      percentInNorm: Number((75 + (b % 20)).toFixed(1)),
    }
  }
  const base = 45 + (a % 120) * 0.2
  const spread = 12 + (b % 15)
  return {
    avg: Number((base + (c % 40) * 0.15).toFixed(1)),
    median: Number((base - spread * 0.06).toFixed(1)),
    min: Number((base - spread * 0.4).toFixed(1)),
    max: Number((base + spread * 0.45).toFixed(1)),
    percentInNorm: Number((70 + (b % 25)).toFixed(1)),
  }
}

/** Заглушка: `GET /rooms/{roomId}/stats` */
export async function fetchRoomStatsMock(
  roomId: string,
  fromIso: string,
  toIso: string,
): Promise<StatsResponse | null> {
  const meta = ROOM_META[roomId]
  if (!meta) return delay(null)

  const seed = hashRoom(roomId + fromIso + toIso)
  return delay({
    roomId,
    buildingName: meta.buildingName,
    roomNumber: meta.roomNumber,
    period: { from: fromIso, to: toIso },
    co2: mockParamStats(seed, "co2"),
    temperature: mockParamStats(seed + 1, "temperature"),
    humidity: mockParamStats(seed + 2, "humidity"),
  })
}

/** Заглушка: `GET /analytics/peak-hours?roomId=...` */
export async function fetchPeakHoursMock(
  roomId: string,
  fromIso: string,
  toIso: string,
): Promise<PeakHoursResponse | null> {
  const meta = ROOM_META[roomId]
  if (!meta) return delay(null)

  const seed = hashRoom(roomId)
  const hourlyAvgCo2 = Array.from({ length: 24 }, (_, hour) => {
    const wave = Math.sin(((hour - 9) / 6) * Math.PI) * 280
    const avgCo2 = Math.round(450 + wave + (seed % 80) + hour * 3)
    return { hour, avgCo2: Math.max(320, avgCo2) }
  })

  return delay({
    roomId,
    period: { from: fromIso, to: toIso },
    hourlyAvgCo2,
  })
}

/** Заглушка: `GET /rooms` */
export async function fetchRoomsMock(buildingId?: string): Promise<RoomsResponse> {
  const rooms = Object.entries(ROOM_META).map(([id, m]) => {
    const seed = hashRoom(id)
    const co2 = 500 + (seed % 400)
    return {
      id,
      buildingId: m.buildingId,
      buildingName: m.buildingName,
      roomNumber: m.roomNumber,
      sensorId: m.sensorId,
      sensorStatus: "online" as const,
      lastTs: new Date().toISOString(),
      co2,
      temperature: 21 + (seed % 5) * 0.3,
      humidity: 50 + (seed % 20),
      overallStatus:
        co2 > 1000 ? ("critical" as const) : co2 > 800 ? ("warning" as const) : ("normal" as const),
    }
  })
  const filtered = buildingId ? rooms.filter((r) => r.buildingId === buildingId) : rooms
  return delay({ rooms: filtered })
}
