import ReactECharts from "echarts-for-react"
import { useMemo } from "react"

import type { PeakHoursResponse } from "@/api/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const AXIS = "#44403c"

function barColor(ppm: number): string {
  if (ppm > 1000) return "#ff6b6b"
  if (ppm >= 800) return "#e6c84a"
  return "#867cde"
}

export function PeakHoursChart({
  data,
  loading,
}: {
  data: PeakHoursResponse | null
  loading: boolean
}) {
  const option = useMemo(() => {
    if (!data?.hourlyAvgCo2?.length) return null
    const hours = data.hourlyAvgCo2.map((h) => `${h.hour}:00`)
    const values = data.hourlyAvgCo2.map((h) => h.avgCo2)
    const colors = data.hourlyAvgCo2.map((h) => barColor(h.avgCo2))
    return {
      grid: { left: 40, right: 16, top: 24, bottom: 28 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: hours,
        axisLabel: { color: AXIS, fontSize: 11 },
        name: "Час",
        nameTextStyle: { color: AXIS, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "ppm",
        nameTextStyle: { color: AXIS, fontSize: 11 },
        axisLabel: { color: AXIS, fontSize: 11 },
        splitLine: { lineStyle: { color: "#d6d3d1", type: "dashed" as const } },
      },
      series: [
        {
          name: "Средний CO₂",
          type: "bar",
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i], borderColor: "#57534e", borderWidth: 0.5 },
          })),
          barMaxWidth: 28,
          emphasis: {
            itemStyle: {
              shadowBlur: 6,
              shadowColor: "rgba(0,0,0,0.12)",
            },
          },
        },
      ],
    }
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Пиковые часы (CO₂)</CardTitle>
        <CardDescription>
          Средние значения по часу суток — контракт{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /analytics/peak-hours</code>. Цвет: в норме /
          предупреждение / критично по порогам CO₂.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : option ? (
          <div className="h-[320px] w-full min-h-[280px]">
            <ReactECharts
              option={option}
              className="avs-peak-chart"
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Нет данных для диаграммы.</p>
        )}
      </CardContent>
    </Card>
  )
}
