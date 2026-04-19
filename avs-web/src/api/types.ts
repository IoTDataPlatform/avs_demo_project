export type ParamStatus = "excellent" | "normal" | "warning" | "critical"
export type OverallStatus = "excellent" | "normal" | "warning" | "critical"
export type SeriesStep = "minute" | "hour" | "day" | "month"
export type SnapshotPeriod = "latest" | "1m" | "1h" | "1d"

export type ErrorResponse = {
  error: string
  message: string
}

export type BuildingDto = {
  id: string
  name: string
}

export type BuildingsResponse = {
  buildings: BuildingDto[]
}

export type RoomCardDto = {
  roomKey: string
  buildingId: string
  buildingName: string
  roomNumber: string
  sensorId: string
  ts: string
  co2: number
  temperature: number
  humidity: number
  co2Status: ParamStatus
  temperatureStatus: ParamStatus
  humidityStatus: ParamStatus
  overallAirStatus: OverallStatus
}

export type RoomsResponse = {
  rooms: RoomCardDto[]
}

export type SensorDto = {
  sensorId: string
}

export type SensorsResponse = {
  roomKey: string
  buildingName: string
  roomNumber: string
  sensors: SensorDto[]
}

export type GlobalSummaryDto = {
  summaryKey: string
  updatedAt: string
  totalSensorsSeen: number
  onlineSensorsCount: number
  onlineSensorIdsCsv: string
  roomsCo2WarningCount: number
  roomsCo2CriticalCount: number
  roomsTemperatureWarningCount: number
  roomsTemperatureCriticalCount: number
  roomsHumidityWarningCount: number
  roomsHumidityCriticalCount: number
}

export type OverviewResponse = {
  summary: GlobalSummaryDto
  onlineRoomsCount: number
  onlineSensorsKeysCount: number
}

export type RoomCurrentResponse = {
  roomKey: string
  buildingName: string
  roomNumber: string
  sensorId: string
  ts: string
  co2: number
  temperature: number
  humidity: number
  co2Status: ParamStatus
  temperatureStatus: ParamStatus
  humidityStatus: ParamStatus
  overallAirStatus: OverallStatus
}

export type SensorCurrentResponse = {
  sensorId: string
  roomKey: string
  buildingName: string
  roomNumber: string
  ts: string
  co2: number
  temperature: number
  humidity: number
  co2Status: ParamStatus
  temperatureStatus: ParamStatus
  humidityStatus: ParamStatus
  overallAirStatus: OverallStatus
}

export type AggregateSnapshotDto = {
  period: string
  roomKey: string
  buildingName: string
  roomNumber: string
  windowStart: string
  windowEnd: string
  co2Avg: number
  temperatureAvg: number
  humidityAvg: number
  co2Status: ParamStatus
  temperatureStatus: ParamStatus
  humidityStatus: ParamStatus
  overallAirStatus: OverallStatus
}

export type RoomAggregatesResponse = {
  roomKey: string
  avg1m: AggregateSnapshotDto | null
  avg1h: AggregateSnapshotDto | null
  avg1d: AggregateSnapshotDto | null
}

export type SeriesPointDto = {
  bucket: string
  co2Avg: number
  temperatureAvg: number
  humidityAvg: number
}

export type SeriesResponse = {
  entityType: "room" | "sensor"
  entityId: string
  from: string
  to: string
  step: SeriesStep
  points: SeriesPointDto[]
}

export type PeriodDto = {
  from: string
  to: string
}

export type MetricStatsDto = {
  avg: number
  median: number
  min: number
  max: number
  percentInNorm: number
}

export type StatsResponse = {
  entityType: "room" | "sensor"
  entityId: string
  buildingName: string | null
  roomNumber: string | null
  period: PeriodDto
  co2: MetricStatsDto
  temperature: MetricStatsDto
  humidity: MetricStatsDto
}

export type SensorListItem = {
  sensorId: string
  roomKey: string
  buildingName: string
  roomNumber: string
  ts: string
  co2: number
  temperature: number
  humidity: number
  co2Status: ParamStatus
  temperatureStatus: ParamStatus
  humidityStatus: ParamStatus
  overallAirStatus: OverallStatus
}

export type RoomStatusSource = {
  roomKey: string
  buildingId: string
  buildingName: string
  roomNumber: string
  sensorId: string
  ts: string
  co2: number
  temperature: number
  humidity: number
  co2Status: ParamStatus
  temperatureStatus: ParamStatus
  humidityStatus: ParamStatus
  overallAirStatus: OverallStatus
}