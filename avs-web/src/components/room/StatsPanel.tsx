import type { ParamStats, StatsResponse } from "@/api/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function StatTable({ title, unit, s }: { title: string; unit: string; s: ParamStats }) {
  const rows: { label: string; value: string }[] = [
    { label: "Среднее", value: `${s.avg} ${unit}` },
    { label: "Медиана", value: `${s.median} ${unit}` },
    { label: "Мин.", value: `${s.min} ${unit}` },
    { label: "Макс.", value: `${s.max} ${unit}` },
    { label: "В норме, %", value: `${s.percentInNorm} %` },
  ]
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-4 text-muted-foreground">{r.label}</td>
              <td className="py-2 text-right font-medium tabular-nums">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatsPanel({
  data,
  loading,
}: {
  data: StatsResponse | null
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Статистика за период</CardTitle>
        <CardDescription>
          Сводка по{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            GET /rooms/{"{"}roomId{"}"}/stats
          </code>{" "}
          (заглушка).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {data.buildingName}, ауд. {data.roomNumber} ·{" "}
              {new Date(data.period.from).toLocaleString("ru-RU", {
                dateStyle: "short",
                timeStyle: "short",
              })}{" "}
              —{" "}
              {new Date(data.period.to).toLocaleString("ru-RU", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <StatTable title="CO₂" unit="ppm" s={data.co2} />
              <StatTable title="Температура" unit="°C" s={data.temperature} />
              <StatTable title="Влажность" unit="%" s={data.humidity} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Нет данных.</p>
        )}
      </CardContent>
    </Card>
  )
}
