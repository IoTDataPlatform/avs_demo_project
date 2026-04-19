import ReactECharts from "echarts-for-react"

import type {SeriesPointDto, SeriesStep} from "@/api/types"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {fromDateTimeLocalValue, toDateTimeLocalValue} from "@/lib/dateRange"

function chartOption(title: string, points: SeriesPointDto[], valueKey: "co2Avg" | "temperatureAvg" | "humidityAvg", unit: string) {
    return {
        tooltip: {trigger: "axis"},
        grid: {left: 50, right: 20, top: 30, bottom: 40},
        xAxis: {
            type: "category",
            data: points.map((p) =>
                new Date(p.bucket).toLocaleString("ru-RU", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            ),
        },
        yAxis: {
            type: "value",
            name: unit,
        },
        series: [
            {
                type: "line",
                smooth: true,
                data: points.map((p) => p[valueKey]),
            },
        ],
        title: {text: title, left: 0, textStyle: {fontSize: 14}},
    }
}

export function SeriesChartsPanel({
                                      from,
                                      to,
                                      step,
                                      onFromChange,
                                      onToChange,
                                      onStepChange,
                                      onApply,
                                      points,
                                  }: {
    from: string
    to: string
    step: SeriesStep
    onFromChange: (v: string) => void
    onToChange: (v: string) => void
    onStepChange: (v: SeriesStep) => void
    onApply: () => void
    points: SeriesPointDto[]
}) {
    return (
        <section className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Графики</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 xl:grid-cols-[1fr_1fr_220px_auto] xl:items-end">
                    <div className="space-y-2">
                        <Label htmlFor="from">С</Label>
                        <Input
                            id="from"
                            type="datetime-local"
                            value={toDateTimeLocalValue(from)}
                            onChange={(e) => {
                                const next = fromDateTimeLocalValue(e.target.value)
                                if (next) onFromChange(next)
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="to">По</Label>
                        <Input
                            id="to"
                            type="datetime-local"
                            value={toDateTimeLocalValue(to)}
                            onChange={(e) => {
                                const next = fromDateTimeLocalValue(e.target.value)
                                if (next) onToChange(next)
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Агрегация</Label>
                        <Select value={step} onValueChange={(v) => onStepChange(v as SeriesStep)}>
                            <SelectTrigger>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="minute">Минута</SelectItem>
                                <SelectItem value="hour">Час</SelectItem>
                                <SelectItem value="day">День</SelectItem>
                                <SelectItem value="month">Месяц</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={onApply}>Обновить</Button>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="h-[300px]">
                            <ReactECharts option={chartOption("CO₂", points, "co2Avg", "ppm")}
                                          style={{height: "100%", width: "100%"}} opts={{renderer: "svg"}}/>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="h-[300px]">
                            <ReactECharts option={chartOption("Температура", points, "temperatureAvg", "°C")}
                                          style={{height: "100%", width: "100%"}} opts={{renderer: "svg"}}/>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="h-[300px]">
                            <ReactECharts option={chartOption("Влажность", points, "humidityAvg", "%")}
                                          style={{height: "100%", width: "100%"}} opts={{renderer: "svg"}}/>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}