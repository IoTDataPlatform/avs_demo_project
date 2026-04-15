import type { CurrentReadingResponse } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { ParamStatusBadge } from "@/components/room/ParamStatusBadge"

const SENSOR_LABELS = {
  online: "Онлайн",
  offline: "Офлайн",
  malfunctioned: "Неисправен",
} as const

function Metric({
  label,
  value,
  unit,
  status,
}: {
  label: string
  value: string
  unit: string
  status: CurrentReadingResponse["co2Status"]
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="text-3xl font-semibold tracking-tight">
          {value}
          <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
        </div>
        <ParamStatusBadge status={status} />
      </div>
    </div>
  )
}

export function CurrentReadingsPanel({
  data,
  loading,
  refreshEverySeconds,
}: {
  data: CurrentReadingResponse | null
  loading: boolean
  refreshEverySeconds: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Сейчас</CardTitle>
        <CardDescription>
          Данные с датчика обновляются каждые {refreshEverySeconds} с (заглушка до подключения API).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : data ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Ауд. {data.roomNumber} · {data.buildingName}
              </span>
              <span className="text-border">·</span>
              <span>Датчик {data.sensorId}</span>
              <Badge variant="outline">{SENSOR_LABELS[data.sensorStatus]}</Badge>
              <span className="text-border">·</span>
              <time dateTime={data.ts}>
                {new Date(data.ts).toLocaleString("ru-RU", {
                  dateStyle: "short",
                  timeStyle: "medium",
                })}
              </time>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="CO₂" value={String(data.co2)} unit="ppm" status={data.co2Status} />
              <Metric
                label="Температура"
                value={String(data.temperature)}
                unit="°C"
                status={data.temperatureStatus}
              />
              <Metric
                label="Влажность"
                value={String(data.humidity)}
                unit="%"
                status={data.humidityStatus}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Аудитория не найдена.</p>
        )}
      </CardContent>
    </Card>
  )
}
