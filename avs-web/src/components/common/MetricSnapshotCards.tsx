import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {StatusBadge} from "@/components/common/StatusBadge"

function Metric({
                    title,
                    value,
                    unit,
                    status,
                }: {
    title: string
    value: number
    unit: string
    status: "excellent" | "normal" | "warning" | "critical"
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="text-3xl font-semibold">
                    {value}
                    <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
                </div>
                <StatusBadge status={status}/>
            </CardContent>
        </Card>
    )
}

export function MetricSnapshotCards({
                                        co2,
                                        temperature,
                                        humidity,
                                        co2Status,
                                        temperatureStatus,
                                        humidityStatus,
                                    }: {
    co2: number
    temperature: number
    humidity: number
    co2Status: "excellent" | "normal" | "warning" | "critical"
    temperatureStatus: "excellent" | "normal" | "warning" | "critical"
    humidityStatus: "excellent" | "normal" | "warning" | "critical"
}) {
    return (
        <section className="grid gap-4 md:grid-cols-3">
            <Metric title="CO₂" value={co2} unit="ppm" status={co2Status}/>
            <Metric title="Температура" value={temperature} unit="°C" status={temperatureStatus}/>
            <Metric title="Влажность" value={humidity} unit="%" status={humidityStatus}/>
        </section>
    )
}