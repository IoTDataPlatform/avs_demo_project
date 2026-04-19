import type {AggregateSnapshotDto} from "@/api/types"
import {StatusBadge} from "@/components/common/StatusBadge"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"

function Row({label, value}: { label: string; value: React.ReactNode }) {
    return (
        <tr className="border-b border-border/60 last:border-b-0">
            <td className="py-2 text-muted-foreground">{label}</td>
            <td className="py-2 text-right">{value}</td>
        </tr>
    )
}

function AggregateCard({
                           title,
                           data,
                       }: {
    title: string
    data: AggregateSnapshotDto | null
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {data ? (
                    <table className="w-full text-sm">
                        <tbody>
                        <Row label="Окно"
                             value={`${new Date(data.windowStart).toLocaleString("ru-RU")} — ${new Date(data.windowEnd).toLocaleString("ru-RU")}`}/>
                        <Row label="CO₂" value={`${data.co2Avg.toFixed(1)} ppm`}/>
                        <Row label="Температура" value={`${data.temperatureAvg.toFixed(1)} °C`}/>
                        <Row label="Влажность" value={`${data.humidityAvg.toFixed(1)} %`}/>
                        <Row label="Итог" value={<StatusBadge status={data.overallAirStatus}/>}/>
                        </tbody>
                    </table>
                ) : (
                    <p className="text-sm text-muted-foreground">Нет данных.</p>
                )}
            </CardContent>
        </Card>
    )
}

export function AggregatesTable({
                                    avg1m,
                                    avg1h,
                                    avg1d,
                                }: {
    avg1m: AggregateSnapshotDto | null
    avg1h: AggregateSnapshotDto | null
    avg1d: AggregateSnapshotDto | null
}) {
    return (
        <section className="grid gap-4 xl:grid-cols-3">
            <AggregateCard title="Средние за последнюю минуту" data={avg1m}/>
            <AggregateCard title="Средние за последний час" data={avg1h}/>
            <AggregateCard title="Средние за последний день" data={avg1d}/>
        </section>
    )
}