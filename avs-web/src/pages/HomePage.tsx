import {useEffect, useMemo, useState} from "react"
import {Link} from "react-router-dom"

import {
    getBuildings,
    getOverview,
    getRoomAggregates,
    getRooms,
    getRoomSensors,
    getSensorCurrent,
    getSensorStats,
} from "@/api/client"
import type {
    BuildingDto,
    OverviewResponse,
    RoomCardDto,
    RoomStatusSource,
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
import {
    aggregateRoomStatus,
    AIR_ORDER,
    asRoomStatusSource,
    asSensorListItem,
    countStatuses,
    sensorFromStatsBase,
} from "@/lib/airQuality"
import {rangeForDays, rangeForHours, rangeForMinutes} from "@/lib/dateRange"

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

export function HomePage() {
    const [overview, setOverview] = useState<OverviewResponse | null>(null)
    const [buildings, setBuildings] = useState<BuildingDto[]>([])
    const [baseRooms, setBaseRooms] = useState<RoomCardDto[]>([])
    const [roomPeriod, setRoomPeriod] = useState<SnapshotPeriod>("latest")
    const [sensorPeriod, setSensorPeriod] = useState<SnapshotPeriod>("latest")
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all")
    const [roomSearch, setRoomSearch] = useState("")
    const [sensorSearch, setSensorSearch] = useState("")
    const [roomsResolved, setRoomsResolved] = useState<RoomStatusSource[]>([])
    const [sensorsResolved, setSensorsResolved] = useState<SensorListItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function loadBase() {
            setLoading(true)
            const [overviewData, buildingData, roomsData] = await Promise.all([
                getOverview(),
                getBuildings(),
                getRooms(),
            ])

            if (cancelled) return

            setOverview(overviewData)
            setBuildings(buildingData.buildings)
            setBaseRooms(roomsData.rooms)
            setLoading(false)
        }

        void loadBase()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function resolveRooms() {
            if (!baseRooms.length) {
                setRoomsResolved([])
                return
            }

            if (roomPeriod === "latest") {
                setRoomsResolved(baseRooms.map(asRoomStatusSource))
                return
            }

            const aggregated = await Promise.all(
                baseRooms.map(async (room) => ({
                    room,
                    agg: await getRoomAggregates(room.roomKey),
                })),
            )

            if (cancelled) return

            setRoomsResolved(
                aggregated.map(({room, agg}) => aggregateRoomStatus(room, agg, roomPeriod)),
            )
        }

        void resolveRooms()

        return () => {
            cancelled = true
        }
    }, [baseRooms, roomPeriod])

    useEffect(() => {
        let cancelled = false

        async function resolveSensors() {
            if (!baseRooms.length) {
                setSensorsResolved([])
                return
            }

            const roomSensors = await Promise.all(
                baseRooms.map(async (room) => ({
                    room,
                    sensors: await getRoomSensors(room.roomKey),
                })),
            )

            const sensorDescriptors = roomSensors.flatMap(({room, sensors}) =>
                sensors.sensors.map((sensor) => ({
                    sensorId: sensor.sensorId,
                    roomKey: room.roomKey,
                    buildingName: room.buildingName,
                    roomNumber: room.roomNumber,
                })),
            )

            if (sensorPeriod === "latest") {
                const sensorCurrents = await Promise.all(
                    sensorDescriptors.map(async (d) => getSensorCurrent(d.sensorId)),
                )
                if (cancelled) return
                setSensorsResolved(sensorCurrents.map(asSensorListItem))
                return
            }

            const range =
                sensorPeriod === "1m"
                    ? rangeForMinutes(1)
                    : sensorPeriod === "1h"
                        ? rangeForHours(1)
                        : rangeForDays(1)

            const sensorStats = await Promise.all(
                sensorDescriptors.map(async (d) => ({
                    ...d,
                    stats: await getSensorStats(d.sensorId, range.from, range.to),
                })),
            )

            if (cancelled) return

            setSensorsResolved(
                sensorStats.map((item) =>
                    sensorFromStatsBase(
                        item.sensorId,
                        item.roomKey,
                        item.buildingName,
                        item.roomNumber,
                        item.stats,
                    ),
                ),
            )
        }

        void resolveSensors()

        return () => {
            cancelled = true
        }
    }, [baseRooms, sensorPeriod])

    const visibleRooms = useMemo(() => {
        return roomsResolved.filter((room) => {
            const matchesBuilding = selectedBuildingId === "all" || room.buildingId === selectedBuildingId
            const needle = roomSearch.trim().toLowerCase()
            const matchesSearch =
                !needle ||
                room.roomNumber.toLowerCase().includes(needle) ||
                room.buildingName.toLowerCase().includes(needle) ||
                room.roomKey.toLowerCase().includes(needle)

            return matchesBuilding && matchesSearch
        })
    }, [roomsResolved, selectedBuildingId, roomSearch])

    const visibleSensors = useMemo(() => {
        return sensorsResolved.filter((sensor) => {
            const buildingId =
                buildings.find((b) => b.name === sensor.buildingName)?.id ?? "bld_unknown"
            const matchesBuilding = selectedBuildingId === "all" || buildingId === selectedBuildingId

            const needle = sensorSearch.trim().toLowerCase()
            const matchesSearch =
                !needle ||
                sensor.sensorId.toLowerCase().includes(needle) ||
                sensor.roomNumber.toLowerCase().includes(needle) ||
                sensor.buildingName.toLowerCase().includes(needle)

            return matchesBuilding && matchesSearch
        })
    }, [sensorsResolved, selectedBuildingId, sensorSearch, buildings])

    const roomCounts = useMemo(() => countStatuses(visibleRooms), [visibleRooms])
    const sensorCounts = useMemo(() => countStatuses(visibleSensors), [visibleSensors])

    const sensorsByStatus = useMemo(() => {
        return AIR_ORDER.map((status) => ({
            status,
            items: visibleSensors.filter((sensor) => sensor.overallAirStatus === status),
        }))
    }, [visibleSensors])

    const roomsByBuildingAndStatus = useMemo(() => {
        const grouped = new Map<string, RoomStatusSource[]>()

        for (const room of visibleRooms) {
            const key = room.buildingName
            const items = grouped.get(key) ?? []
            items.push(room)
            grouped.set(key, items)
        }

        return Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([buildingName, items]) => ({
                buildingName,
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

                        {loading ? (
                            <div>Загрузка…</div>
                        ) : (
                            sensorsByStatus.map((group) => (
                                <div key={group.status} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={group.status}/>
                                        <span className="text-sm text-muted-foreground">{group.items.length} шт.</span>
                                    </div>

                                    <div className="space-y-2">
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
                                </div>
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

                        {roomsByBuildingAndStatus.map((buildingGroup) => (
                            <div key={buildingGroup.buildingName} className="space-y-3">
                                <h3 className="text-base font-semibold">{buildingGroup.buildingName}</h3>

                                {buildingGroup.statuses.map((statusGroup) => (
                                    <div key={statusGroup.status} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={statusGroup.status}/>
                                            <span
                                                className="text-sm text-muted-foreground">{statusGroup.items.length} шт.</span>
                                        </div>

                                        <div className="space-y-2">
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
                                    </div>
                                ))}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>
        </div>
    )
}