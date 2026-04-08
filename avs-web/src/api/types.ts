export type SensorStatus = "online" | "offline" | "malfunctioned"
export type ParamStatus = "normal" | "warning" | "critical"
export type OverallStatus = "normal" | "warning" | "critical"
export type HistoryInterval = "raw" | "1h" | "1d"

export type Building = {
  id: string
  name: string
}

export type RoomSummary = {
  id: string
  buildingId: string
  buildingName: string
  roomNumber: string
  sensorId: string
  sensorStatus: SensorStatus
  lastTs: string
  co2: number
  temperature: number
  humidity: number
  overallStatus: OverallStatus
}

export type CurrentReadingResponse = {
  sensorId: string
  roomId: string
  buildingName: string
  roomNumber: string
  ts: string
  co2: number
  temperature: number
  humidity: number
  sensorStatus: SensorStatus
  co2Status: ParamStatus
  temperatureStatus: ParamStatus
  humidityStatus: ParamStatus
}

export type DataPoint = {
  ts: string
  co2: number
  temperature: number
  humidity: number
}

export type HistoryResponse = {
  roomId: string
  from: string
  to: string
  interval: HistoryInterval
  limit: number
  offset: number
  total: number
  data: DataPoint[]
}

export type ParamStats = {
  avg: number
  median: number
  min: number
  max: number
  percentInNorm: number
}

export type Period = {
  from: string
  to: string
}

export type StatsResponse = {
  roomId: string
  buildingName: string
  roomNumber: string
  period: Period
  co2: ParamStats
  temperature: ParamStats
  humidity: ParamStats
}

export type PeakHoursResponse = {
  roomId: string
  period: Period
  hourlyAvgCo2: { hour: number; avgCo2: number }[]
}

export type RoomsResponse = {
  rooms: RoomSummary[]
}
