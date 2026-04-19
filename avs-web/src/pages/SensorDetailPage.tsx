import {ArrowLeft} from "lucide-react"
import {useEffect, useMemo, useState} from "react"
import {Link, useParams} from "react-router-dom"

import {getSensorCurrent, getSensorSeries, getSensorStats,} from "@/api/client"
import type {SensorCurrentResponse, SeriesPointDto, SeriesStep, StatsResponse,} from "@/api/types"
import {MetricSnapshotCards} from "@/components/common/MetricSnapshotCards"
import {SeriesChartsPanel} from "@/components/common/SeriesChartsPanel"
import {StatsPanel} from "@/components/common/StatsPanel"
import {StatusBadge} from "@/components/common/StatusBadge"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {rangeForDays} from "@/lib/dateRange"

export function SensorDetailPage() {
    const {sensorId = ""} = useParams()

    const initialRange = useMemo(() => rangeForDays(7), [])
    const [from, setFrom] = useState(initialRange.from)
    const [to, setTo] = useState(initialRange.to)
    const [step, setStep] = useState<SeriesStep>("hour")
    const [queryFrom, setQueryFrom] = useState(initialRange.from)
    const [queryTo, setQueryTo] = useState(initialRange.to)
    const [queryStep, setQueryStep] = useState<SeriesStep>("hour")

    const [current, setCurrent] = useState<SensorCurrentResponse | null>(null)
    const [stats, setStats] = useState<StatsResponse | null>(null)
    const [points, setPoints] = useState<SeriesPointDto[]>([])

    useEffect(() => {
        if (!sensorId) return
        void getSensorCurrent(sensorId).then(setCurrent)
    }, [sensorId])

    useEffect(() => {
        if (!sensorId) return
        void Promise.all([
            getSensorStats(sensorId, queryFrom, queryTo),
            getSensorSeries(sensorId, queryFrom, queryTo, queryStep),
        ]).then(([statsData, seriesData]) => {
            setStats(statsData)
            setPoints(seriesData.points)
        })
    }, [sensorId, queryFrom, queryTo, queryStep])

    if (!sensorId) {
        return <div className="p-6">Нет sensorId</div>
    }

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link to="/" className="gap-2">
                        <ArrowLeft className="size-4"/>
                        На главную
                    </Link>
                </Button>
            </div>

            {current ? (
                <>
                    <header className="space-y-2">
                        <h1 className="text-3xl font-semibold">{current.sensorId}</h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>{current.buildingName}</span>
                            <span>ауд. {current.roomNumber}</span>
                            <span>{new Date(current.ts).toLocaleString("ru-RU")}</span>
                            <StatusBadge status={current.overallAirStatus}/>
                        </div>
                    </header>

                    <MetricSnapshotCards
                        co2={current.co2}
                        temperature={current.temperature}
                        humidity={current.humidity}
                        co2Status={current.co2Status}
                        temperatureStatus={current.temperatureStatus}
                        humidityStatus={current.humidityStatus}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Привязка</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link
                                to={`/rooms/${encodeURIComponent(current.roomKey)}`}
                                className="text-primary underline underline-offset-4"
                            >
                                Перейти к комнате {current.roomKey}
                            </Link>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <div>Загрузка текущих данных…</div>
            )}

            <SeriesChartsPanel
                from={from}
                to={to}
                step={step}
                onFromChange={setFrom}
                onToChange={setTo}
                onStepChange={setStep}
                onApply={() => {
                    setQueryFrom(from)
                    setQueryTo(to)
                    setQueryStep(step)
                }}
                points={points}
            />

            {stats ? <StatsPanel stats={stats}/> : null}
        </div>
    )
}