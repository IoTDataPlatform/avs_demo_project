import type { OverallStatus, ParamStatus } from "@/api/types"
import { Badge } from "@/components/ui/badge"

type Status = OverallStatus | ParamStatus

const LABELS: Record<Status, string> = {
    excellent: "Отлично",
    normal: "Норма",
    warning: "Warning",
    critical: "Плохой воздух",
}

const CLASS_MAP: Record<Status, string> = {
    excellent: "border-transparent bg-emerald-600/15 text-emerald-900",
    normal: "border-transparent bg-indigo-600/15 text-indigo-900",
    warning: "border-transparent bg-amber-500/15 text-amber-950",
    critical: "border-transparent bg-red-600/15 text-red-950",
}

export function StatusBadge({ status }: { status: Status }) {
    return (
        <Badge variant="secondary" className={CLASS_MAP[status]}>
            {LABELS[status]}
        </Badge>
    )
}