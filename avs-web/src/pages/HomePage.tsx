import {useEffect, useMemo, useState} from "react"
import {Link} from "react-router-dom"

import {
    getBuildings,
    getOverview,
    getRooms,
    getSensors,
} from "@/api/client"
import type {
    BuildingDto,
    OverviewResponse,
    RoomCardDto,
    SensorListItem,
    SnapshotPeriod,
} from "@/api/types"
import {AirQualityDonutCard} from "@/components/common/AirQualityDonutCard"
import {OverviewHeader} from "@/components/common/OverviewHeader"
import {StatusBadge} from "@/components/common/StatusBadge"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {AIR_ORDER, countStatuses} from "@/lib/airQuality"

function SearchBox({
                       value,
                       onChange,
                       placeholder,
                   }: {
    value: string
    onChange: (v: string) => void
    placeholder: string
}) {
    return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}/>
}

const SUMMARY_CLASS =
    "flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/40 [&::-webkit-details-marker]:hidden"

export function HomePage() {
    const [overview, setOverview] = useState<OverviewResponse | null>(null)
    const [buildings, setBuildings] = useState<BuildingDto[]>([])
    const [rooms, setRooms] = useState<RoomCardDto[]>([])
    const [sensors, setSensors] = useState<SensorListItem[]>([])
    const [roomPeriod, setRoomPeriod] = useState<SnapshotPeriod>("latest")
    const [sensorPeriod, setSensorPeriod] = useState<SnapshotPeriod>("latest")
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all")
    const [roomSearch, setRoomSearch] = useState("")
    const [sensorSearch, setSensorSearch] = useState("")
    const [initialLoading, setInitialLoading] = useState(true)
    const [roomsLoading, setRoomsLoading] = useState(false)
    const [sensorsLoading, setSensorsLoading] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function loadBase() {
            const [overviewData, buildingData] = await Promise.all([
                getOverview(),
                getBuildings(),
            ])

            if (cancelled) return

            setOverview(overviewData)
            setBuildings(buildingData.buildings)
            setInitialLoading(false)
        }

        void loadBase()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        setRoomsLoading(true)

        const buildingId = selectedBuildingId === "all" ? undefined : selectedBuildingId

        getRooms(buildingId, roomPeriod).then((response) => {
            if (cancelled) return
            setRooms(response.rooms)
            setRoomsLoading(false)
        })

        return () => {
            cancelled = true
        }
    }, [roomPeriod, selectedBuildingId])

    useEffect(() => {
        let cancelled = false
        setSensorsLoading(true)

        const buildingId = selectedBuildingId === "all" ? undefined : selectedBuildingId

        getSensors(sensorPeriod, buildingId).then((response) => {
            if (cancelled) return
            setSensors(response.sensors)
            setSensorsLoading(false)
        })

        return () => {
            cancelled = true
        }
    }, [sensorPeriod, selectedBuildingId])

    const visibleRooms = useMemo(() => {
        const needle = roomSearch.trim().toLowerCase()
        if (!needle) return rooms
        return rooms.filter((room) =>
            room.roomNumber.toLowerCase().includes(needle) ||
            room.buildingName.toLowerCase().includes(needle) ||
            room.roomKey.toLowerCase().includes(needle),
        )
    }, [rooms, roomSearch])

    const visibleSensors = useMemo(() => {
        const needle = sensorSearch.trim().toLowerCase()
        if (!needle) return sensors
        return sensors.filter((sensor) =>
            sensor.sensorId.toLowerCase().includes(needle) ||
            sensor.roomNumber.toLowerCase().includes(needle) ||
            sensor.buildingName.toLowerCase().includes(needle),
        )
    }, [sensors, sensorSearch])

    const roomCounts = useMemo(() => countStatuses(visibleRooms), [visibleRooms])
    const sensorCounts = useMemo(() => countStatuses(visibleSensors), [visibleSensors])

    const sensorsByStatus = useMemo(() => {
        return AIR_ORDER.map((status) => ({
            status,
            items: visibleSensors.filter((sensor) => sensor.overallAirStatus === status),
        }))
    }, [visibleSensors])

    const roomsByBuildingAndStatus = useMemo(() => {
        const grouped = new Map<string, RoomCardDto[]>()

        for (const room of visibleRooms) {
            const items = grouped.get(room.buildingName) ?? []
            items.push(room)
            grouped.set(room.buildingName, items)
        }

        return Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([buildingName, items]) => ({
                buildingName,
                count: items.length,
                statuses: AIR_ORDER.map((status) => ({
                    status,
                    items: items.filter((room) => room.overallAirStatus === status),
                })),
            }))
    }, [visibleRooms])

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8">
            <header className="space-y-2">
                <h1 className="text-3xl font-semibold">AVS Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Комнаты, датчики, статус воздуха и переход к подробной аналитике.
                </p>
            </header>

            {overview ? <OverviewHeader overview={overview}/> : <div>Загрузка overview…</div>}

            <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Настройки витрины</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Период для комнат</Label>
                            <Select value={roomPeriod} onValueChange={(v) => setRoomPeriod(v as SnapshotPeriod)}>
                                <SelectTrigger>
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="latest">Последнее значение</SelectItem>
                                    <SelectItem value="1m">Среднее за минуту</SelectItem>
                                    <SelectItem value="1h">Среднее за час</SelectItem>
                                    <SelectItem value="1d">Среднее за день</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Период для датчиков</Label>
                            <Select value={sensorPeriod} onValueChange={(v) => setSensorPeriod(v as SnapshotPeriod)}>
                                <SelectTrigger>
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="latest">Последнее значение</SelectItem>
                                    <SelectItem value="1m">Среднее за минуту</SelectItem>
                                    <SelectItem value="1h">Среднее за час</SelectItem>
                                    <SelectItem value="1d">Среднее за день</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Здание</Label>
                            <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                                <SelectTrigger>
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все здания</SelectItem>
                                    {buildings.map((building) => (
                                        <SelectItem key={building.id} value={building.id}>
                                            {building.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                    <AirQualityDonutCard title="Статусы датчиков" counts={sensorCounts}/>
                    <AirQualityDonutCard title="Статусы комнат" counts={roomCounts}/>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Список датчиков</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <SearchBox
                            value={sensorSearch}
                            onChange={setSensorSearch}
                            placeholder="Поиск по sensorId, комнате или зданию"
                        />

                        {initialLoading || sensorsLoading ? (
                            <div>Загрузка…</div>
                        ) : sensorsByStatus.every((g) => g.items.length === 0) ? (
                            <div className="text-sm text-muted-foreground">Нет датчиков под текущие фильтры.</div>
                        ) : (
                            sensorsByStatus
                                .filter((group) => group.items.length > 0)
                                .map((group) => (
                                    <details key={group.status} className="group space-y-2">
                                        <summary className={SUMMARY_CLASS}>
                                            <div className="flex items-center gap-2">
                                                <span aria-hidden className="text-xs text-muted-foreground transition-transform group-open:rotate-90">▶</span>
                                                <StatusBadge status={group.status}/>
                                                <span className="text-sm text-muted-foreground">
                                                    {group.items.length} шт.
                                                </span>
                                            </div>
                                        </summary>

                                        <div className="space-y-2 pl-3 pt-2">
                                            {group.items.map((sensor) => (
                                                <Link
                                                    key={sensor.sensorId}
                                                    to={`/sensors/${encodeURIComponent(sensor.sensorId)}`}
                                                    className="block rounded-lg border border-border px-3 py-3 hover:bg-muted/40"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <div className="font-medium">{sensor.sensorId}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {sensor.buildingName} · ауд. {sensor.roomNumber}
                                                            </div>
                                                        </div>
                                                        <div className="text-right text-sm">
                                                            <div>CO₂: {sensor.co2.toFixed(1)}</div>
                                                            <div>T: {sensor.temperature.toFixed(1)} °C</div>
                                                            <div>H: {sensor.humidity.toFixed(1)} %</div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </details>
                                ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Список комнат</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <SearchBox
                            value={roomSearch}
                            onChange={setRoomSearch}
                            placeholder="Поиск по комнате, зданию или roomKey"
                        />

                        {initialLoading || roomsLoading ? (
                            <div>Загрузка…</div>
                        ) : roomsByBuildingAndStatus.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Нет комнат под текущие фильтры.</div>
                        ) : (
                            roomsByBuildingAndStatus.map((buildingGroup) => (
                                <details key={buildingGroup.buildingName} className="group space-y-2">
                                    <summary className={SUMMARY_CLASS}>
                                        <div className="flex items-center gap-2">
                                            <span aria-hidden className="text-xs text-muted-foreground transition-transform group-open:rotate-90">▶</span>
                                            <span className="font-medium">{buildingGroup.buildingName}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {buildingGroup.count} шт.
                                            </span>
                                        </div>
                                    </summary>

                                    <div className="space-y-2 pl-3 pt-2">
                                        {buildingGroup.statuses
                                            .filter((sg) => sg.items.length > 0)
                                            .map((statusGroup) => (
                                                <details key={statusGroup.status} className="group/inner space-y-2">
                                                    <summary className={SUMMARY_CLASS}>
                                                        <div className="flex items-center gap-2">
                                                            <span aria-hidden className="text-xs text-muted-foreground transition-transform group-open/inner:rotate-90">▶</span>
                                                            <StatusBadge status={statusGroup.status}/>
                                                            <span className="text-sm text-muted-foreground">
                                                                {statusGroup.items.length} шт.
                                                            </span>
                                                        </div>
                                                    </summary>

                                                    <div className="space-y-2 pl-3 pt-2">
                                                        {statusGroup.items.map((room) => (
                                                            <Link
                                                                key={room.roomKey}
                                                                to={`/rooms/${encodeURIComponent(room.roomKey)}`}
                                                                className="block rounded-lg border border-border px-3 py-3 hover:bg-muted/40"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div>
                                                                        <div className="font-medium">Ауд. {room.roomNumber}</div>
                                                                        <div className="text-sm text-muted-foreground">
                                                                            {room.roomKey} · sensor {room.sensorId}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right text-sm">
                                                                        <div>CO₂: {room.co2.toFixed(1)}</div>
                                                                        <div>T: {room.temperature.toFixed(1)} °C</div>
                                                                        <div>H: {room.humidity.toFixed(1)} %</div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </details>
                                            ))}
                                    </div>
                                </details>
                            ))
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    )
}
