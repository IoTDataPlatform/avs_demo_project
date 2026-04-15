import ReactECharts from "echarts-for-react"
import { useMemo } from "react"

import type { DataPoint, HistoryInterval } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/dateRange"

const IRIS = "#5c4ad1"
const TEMP = "#c2410c"
const HUMIDITY = "#0369a1"
const AXIS = "#44403c"
const GRID_LINE = "#d6d3d1"

function lineOption(
  title: string,
  times: string[],
  series: { name: string; data: number[]; color: string; unit: string }[],
) {
  return {
    color: series.map((s) => s.color),
    grid: { left: 52, right: series.length > 1 ? 52 : 24, top: 44, bottom: 28 },
    tooltip: {
      trigger: "axis",
    },
    legend: {
      top: 0,
      textStyle: { color: AXIS, fontSize: 12 },
      itemStyle: { opacity: 1 },
    },
    xAxis: {
      type: "category",
      data: times,
      axisLabel: { color: AXIS, fontSize: 11 },
    },
    yAxis: series.map((s, idx) => ({
      type: "value",
      name: s.unit,
      nameTextStyle: { color: s.color, fontSize: 11, fontWeight: 600 },
      position: idx === 0 ? "left" : "right",
      offset: idx > 1 ? (idx - 1) * 52 : 0,
      axisLabel: { color: s.color, fontSize: 11 },
      axisLine: { lineStyle: { color: s.color } },
      splitLine: { lineStyle: { color: GRID_LINE, type: "dashed" as const } },
    })),
    series: series.map((s, idx) => ({
      name: s.name,
      type: "line",
      smooth: true,
      showSymbol: times.length < 40,
      symbolSize: 6,
      yAxisIndex: idx,
      data: s.data,
      lineStyle: { width: 2.5, color: s.color },
      itemStyle: { color: s.color },
      emphasis: {
        focus: "series" as const,
        lineStyle: { width: 3, color: s.color },
      },
    })),
    title: {
      text: title,
      left: 0,
      textStyle: { color: AXIS, fontSize: 13, fontWeight: 600 },
    },
  }
}

export function HistoryChartsPanel({
  roomId,
  draftFrom,
  draftTo,
  onDraftChange,
  onApplyDraft,
  onPreset,
  interval,
  onIntervalChange,
  points,
  loading,
}: {
  roomId: string
  draftFrom: string
  draftTo: string
  onDraftChange: (fromIso: string, toIso: string) => void
  onApplyDraft: () => void
  onPreset: (preset: "24h" | "7d" | "30d") => void
  interval: HistoryInterval
  onIntervalChange: (v: HistoryInterval) => void
  points: DataPoint[]
  loading: boolean
}) {
  const times = useMemo(
    () =>
      points.map((p) =>
        new Date(p.ts).toLocaleString("ru-RU", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      ),
    [points],
  )

  const co2Option = useMemo(
    () =>
      lineOption("CO₂", times, [{ name: "CO₂", data: points.map((p) => p.co2), color: IRIS, unit: "ppm" }]),
    [points, times],
  )

  const tempHumOption = useMemo(
    () =>
      lineOption("Температура и влажность", times, [
        {
          name: "Температура",
          data: points.map((p) => p.temperature),
          color: TEMP,
          unit: "°C",
        },
        {
          name: "Влажность",
          data: points.map((p) => p.humidity),
          color: HUMIDITY,
          unit: "%",
        },
      ]),
    [points, times],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>История</CardTitle>
        <CardDescription>
          Период и шаг агрегации соответствуют контракту{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            GET /rooms/{"{"}roomId{"}"}/history
          </code>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hist-from">С</Label>
              <Input
                id="hist-from"
                type="datetime-local"
                value={toDateTimeLocalValue(draftFrom)}
                onChange={(e) => {
                  const iso = fromDateTimeLocalValue(e.target.value)
                  if (iso) onDraftChange(iso, draftTo)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hist-to">По</Label>
              <Input
                id="hist-to"
                type="datetime-local"
                value={toDateTimeLocalValue(draftTo)}
                onChange={(e) => {
                  const iso = fromDateTimeLocalValue(e.target.value)
                  if (iso) onDraftChange(draftFrom, iso)
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onPreset("24h")}>
              24 ч
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onPreset("7d")}>
              7 дн.
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onPreset("30d")}>
              30 дн.
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Интервал</span>
            <Select value={interval} onValueChange={(v) => onIntervalChange(v as HistoryInterval)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Шаг" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">Сырые</SelectItem>
                <SelectItem value="1h">1 час</SelectItem>
                <SelectItem value="1d">1 день</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => onApplyDraft()}>
            Обновить графики
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : points.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет точек за выбранный период (roomId: {roomId}).</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-1">
            <div className="h-[300px] w-full min-h-[280px]">
              <ReactECharts
                option={co2Option}
                className="avs-history-chart"
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "svg" }}
              />
            </div>
            <div className="h-[300px] w-full min-h-[280px]">
              <ReactECharts
                option={tempHumOption}
                className="avs-history-chart"
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "svg" }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
