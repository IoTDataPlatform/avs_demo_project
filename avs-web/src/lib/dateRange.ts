export function nowIso() {
  return new Date().toISOString()
}

export function rangeForDays(days: number) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function rangeForHours(hours: number) {
  const to = new Date()
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function rangeForMinutes(minutes: number) {
  const to = new Date()
  const from = new Date(to.getTime() - minutes * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
  )}:${pad(d.getMinutes())}`
}

export function fromDateTimeLocalValue(value: string): string | null {
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString()
}