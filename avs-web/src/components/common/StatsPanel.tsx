import type {MetricStatsDto, StatsResponse} from "@/api/types"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"

function MetricStatsTable({
                              title,
                              unit,
                              metric,
                          }: {
    title: string
    unit: string
    metric: MetricStatsDto
}) {
    const rows = [
        {label: "Среднее", value: `${metric.avg.toFixed(1)} ${unit}`},
        {label: "Медиана", value: `${metric.median.toFixed(1)} ${unit}`},
        {label: "Минимум", value: `${metric.min.toFixed(1)} ${unit}`},
        {label: "Максимум", value: `${metric.max.toFixed(1)} ${unit}`},
        {label: "В норме", value: `${metric.percentInNorm.toFixed(1)} %`},
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <table className="w-full text-sm">
                    <tbody>
                    {rows.map((row) => (
                        <tr key={row.label} className="border-b border-border/60 last:border-b-0">
                            <td className="py-2 text-muted-foreground">{row.label}</td>
                            <td className="py-2 text-right">{row.value}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}

export function StatsPanel({stats}: { stats: StatsResponse }) {
    return (
        <section className="space-y-4">
            <div className="text-sm text-muted-foreground">
                Период: {new Date(stats.period.from).toLocaleString("ru-RU")} —{" "}
                {new Date(stats.period.to).toLocaleString("ru-RU")}
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
                <MetricStatsTable title="CO₂" unit="ppm" metric={stats.co2}/>
                <MetricStatsTable title="Температура" unit="°C" metric={stats.temperature}/>
                <MetricStatsTable title="Влажность" unit="%" metric={stats.humidity}/>
            </div>
        </section>
    )
}