import {ArrowLeft} from "lucide-react"
import {useEffect, useMemo, useState} from "react"
import {Link, useParams} from "react-router-dom"

import {getRoomAggregates, getRoomCurrent, getRoomSeries, getRoomStats,} from "@/api/client"
import type {RoomAggregatesResponse, RoomCurrentResponse, SeriesPointDto, SeriesStep, StatsResponse,} from "@/api/types"
import {AggregatesTable} from "@/components/common/AggregatesTable"
import {MetricSnapshotCards} from "@/components/common/MetricSnapshotCards"
import {SeriesChartsPanel} from "@/components/common/SeriesChartsPanel"
import {StatsPanel} from "@/components/common/StatsPanel"
import {StatusBadge} from "@/components/common/StatusBadge"
import {Button} from "@/components/ui/button"
import {rangeForDays} from "@/lib/dateRange"

const POLL_INTERVAL_MS = 5_000

export function RoomDetailPage() {
    const {roomKey = ""} = useParams()

    const initialRange = useMemo(() => rangeForDays(7), [])
    const [from, setFrom] = useState(initialRange.from)
    const [to, setTo] = useState(initialRange.to)
    const [step, setStep] = useState<SeriesStep>("hour")
    const [queryFrom, setQueryFrom] = useState(initialRange.from)
    const [queryTo, setQueryTo] = useState(initialRange.to)
    const [queryStep, setQueryStep] = useState<SeriesStep>("hour")

    const [current, setCurrent] = useState<RoomCurrentResponse | null>(null)
    const [aggregates, setAggregates] = useState<RoomAggregatesResponse | null>(null)
    const [stats, setStats] = useState<StatsResponse | null>(null)
    const [points, setPoints] = useState<SeriesPointDto[]>([])

    useEffect(() => {
        if (!roomKey) return
        let cancelled = false

        async function load() {
            const [currentData, aggregatesData] = await Promise.all([
                getRoomCurrent(roomKey),
                getRoomAggregates(roomKey),
            ])
            if (cancelled) return
            setCurrent(currentData)
            setAggregates(aggregatesData)
        }

        void load()

        return () => {
            cancelled = true
        }
    }, [roomKey])

    useEffect(() => {
        if (!roomKey) return
        let cancelled = false

        async function refresh() {
            if (document.hidden) return

            const [currentResult, aggregatesResult] = await Promise.allSettled([
                getRoomCurrent(roomKey),
                getRoomAggregates(roomKey),
            ])

            if (cancelled) return

            if (currentResult.status === "fulfilled") setCurrent(currentResult.value)
            if (aggregatesResult.status === "fulfilled") setAggregates(aggregatesResult.value)
        }

        const id = window.setInterval(() => {
            void refresh()
        }, POLL_INTERVAL_MS)

        return () => {
            cancelled = true
            window.clearInterval(id)
        }
    }, [roomKey])

    useEffect(() => {
        if (!roomKey) return
        void Promise.all([
            getRoomStats(roomKey, queryFrom, queryTo),
            getRoomSeries(roomKey, queryFrom, queryTo, queryStep),
        ]).then(([statsData, seriesData]) => {
            setStats(statsData)
            setPoints(seriesData.points)
        })
    }, [roomKey, queryFrom, queryTo, queryStep])

    if (!roomKey) {
        return <div className="p-6">Нет roomKey</div>
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
                        <h1 className="text-3xl font-semibold">
                            Комната {current.roomNumber}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>{current.buildingName}</span>
                            <span>sensor: {current.sensorId}</span>
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
                </>
            ) : (
                <div>Загрузка текущих данных…</div>
            )}

            {aggregates ? (
                <AggregatesTable
                    avg1m={aggregates.avg1m}
                    avg1h={aggregates.avg1h}
                    avg1d={aggregates.avg1d}
                />
            ) : null}

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