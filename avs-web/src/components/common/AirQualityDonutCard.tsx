import ReactECharts from "echarts-for-react"

import type { OverallStatus } from "@/api/types"
import { AIR_ORDER, formatStatusLabel, statusColor } from "@/lib/airQuality"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AirQualityDonutCard({
                                        title,
                                        counts,
                                    }: {
    title: string
    counts: Record<OverallStatus, number>
}) {
    const total = AIR_ORDER.reduce((sum, key) => sum + counts[key], 0)

    const option = {
        tooltip: {
            trigger: "item",
            formatter: "{b}: {c} ({d}%)",
        },
        legend: {
            bottom: 0,
            left: "center",
            textStyle: { fontSize: 12 },
        },
        series: [
            {
                type: "pie",
                radius: ["50%", "75%"],
                center: ["50%", "42%"],
                label: { show: false },
                data: AIR_ORDER.map((status) => ({
                    name: formatStatusLabel(status),
                    value: counts[status],
                    itemStyle: { color: statusColor(status) },
                })),
            },
        ],
        graphic: [
            {
                type: "text",
                left: "center",
                top: "34%",
                style: {
                    text: String(total),
                    fontSize: 26,
                    fontWeight: 700,
                    fill: "#111827",
                },
            },
            {
                type: "text",
                left: "center",
                top: "44%",
                style: {
                    text: "всего",
                    fontSize: 12,
                    fill: "#6b7280",
                },
            },
        ],
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[320px]">
                    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                </div>
            </CardContent>
        </Card>
    )
}