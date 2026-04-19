import type { OverviewResponse } from "@/api/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function StatCard({
                      title,
                      value,
                      subtitle,
                  }: {
    title: string
    value: string | number
    subtitle?: string
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-semibold">{value}</div>
                {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
            </CardContent>
        </Card>
    )
}

export function OverviewHeader({ overview }: { overview: OverviewResponse }) {
    const s = overview.summary

    return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            <StatCard
                title="Работающие сенсоры"
                value={overview.onlineSensorsKeysCount}
                subtitle={`Всего замечено: ${s.totalSensorsSeen}`}
            />
            <StatCard
                title="Комнаты в работе"
                value={overview.onlineRoomsCount}
                subtitle={`Обновлено: ${new Date(s.updatedAt).toLocaleString("ru-RU")}`}
            />

            <StatCard title="CO₂ warning" value={s.roomsCo2WarningCount} />
            <StatCard title="CO₂ critical" value={s.roomsCo2CriticalCount} />

            <StatCard title="Temperature warning" value={s.roomsTemperatureWarningCount} />
            <StatCard title="Temperature critical" value={s.roomsTemperatureCriticalCount} />

            <StatCard title="Humidity warning" value={s.roomsHumidityWarningCount} />
            <StatCard title="Humidity critical" value={s.roomsHumidityCriticalCount} />
        </section>
    )
}