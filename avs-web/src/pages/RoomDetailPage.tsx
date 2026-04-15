import { ArrowLeft } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import type { DataPoint, HistoryInterval } from "@/api/types"
import { fetchPeakHoursMock, fetchRoomHistoryMock, fetchRoomStatsMock } from "@/api/mockClient"
import { Button } from "@/components/ui/button"
import { HistoryChartsPanel } from "@/components/room/HistoryChartsPanel"
import { PeakHoursChart } from "@/components/room/PeakHoursChart"
import { RoomCurrentSection } from "@/components/room/RoomCurrentSection"
import { StatsPanel } from "@/components/room/StatsPanel"
import { defaultPeriod, presetPeriod } from "@/lib/dateRange"

export function RoomDetailPage() {
  const { roomId = "" } = useParams()

  const initial = defaultPeriod()
  const [draftFrom, setDraftFrom] = useState(initial.from)
  const [draftTo, setDraftTo] = useState(initial.to)
  const [queryFrom, setQueryFrom] = useState(initial.from)
  const [queryTo, setQueryTo] = useState(initial.to)
  const [interval, setInterval] = useState<HistoryInterval>("1h")

  const [historyPoints, setHistoryPoints] = useState<DataPoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchRoomStatsMock>>>(null)
  const [peak, setPeak] = useState<Awaited<ReturnType<typeof fetchPeakHoursMock>>>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const applyDraft = useCallback(() => {
    setQueryFrom(draftFrom)
    setQueryTo(draftTo)
  }, [draftFrom, draftTo])

  const applyPreset = useCallback((preset: "24h" | "7d" | "30d") => {
    const p = presetPeriod(preset)
    setDraftFrom(p.from)
    setDraftTo(p.to)
    setQueryFrom(p.from)
    setQueryTo(p.to)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!roomId) return
      setHistoryLoading(true)
      const res = await fetchRoomHistoryMock(roomId, queryFrom, queryTo, interval)
      if (!cancelled) {
        setHistoryPoints(res?.data ?? [])
        setHistoryLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [roomId, queryFrom, queryTo, interval])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!roomId) return
      setAnalyticsLoading(true)
      const [s, p] = await Promise.all([
        fetchRoomStatsMock(roomId, queryFrom, queryTo),
        fetchPeakHoursMock(roomId, queryFrom, queryTo),
      ])
      if (!cancelled) {
        setStats(s)
        setPeak(p)
        setAnalyticsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [roomId, queryFrom, queryTo])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="gap-2">
            <ArrowLeft className="size-4" />
            На главную
          </Link>
        </Button>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Аудитория {stats?.roomNumber ?? roomId}
        </h1>
        <p className="text-sm text-muted-foreground">
          {stats?.buildingName ?? "…"} · мок-данные до подключения бэкенда
        </p>
      </header>

      {roomId ? <RoomCurrentSection key={roomId} roomId={roomId} /> : null}

      <HistoryChartsPanel
        roomId={roomId}
        draftFrom={draftFrom}
        draftTo={draftTo}
        onDraftChange={(f, t) => {
          setDraftFrom(f)
          setDraftTo(t)
        }}
        onApplyDraft={applyDraft}
        onPreset={applyPreset}
        interval={interval}
        onIntervalChange={setInterval}
        points={historyPoints}
        loading={historyLoading}
      />

      <StatsPanel data={stats} loading={analyticsLoading} />

      <PeakHoursChart data={peak} loading={analyticsLoading} />
    </div>
  )
}
