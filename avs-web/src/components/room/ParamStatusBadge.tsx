import type { ParamStatus } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const LABELS: Record<ParamStatus, string> = {
  normal: "Норма",
  warning: "Предупреждение",
  critical: "Критично",
}

const STATUS_CLASS: Record<Exclude<ParamStatus, "critical">, string> = {
  normal:
    "border-transparent bg-emerald-600/12 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning:
    "border-transparent bg-amber-500/15 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200",
}

export function ParamStatusBadge({ status }: { status: ParamStatus }) {
  if (status === "critical") {
    return <Badge variant="destructive">{LABELS[status]}</Badge>
  }
  return (
    <Badge variant="secondary" className={cn(STATUS_CLASS[status])}>
      {LABELS[status]}
    </Badge>
  )
}
