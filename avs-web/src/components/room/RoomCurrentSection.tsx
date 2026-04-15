import { useEffect, useState } from "react"

import type { CurrentReadingResponse } from "@/api/types"
import { fetchRoomCurrentMock } from "@/api/mockClient"
import { CurrentReadingsPanel } from "@/components/room/CurrentReadingsPanel"

const REFRESH_INTERVAL_MS = 10_000

export function RoomCurrentSection({ roomId }: { roomId: string }) {
  const [current, setCurrent] = useState<CurrentReadingResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function tick() {
      if (!roomId) return
      const res = await fetchRoomCurrentMock(roomId)
      if (!cancelled) {
        setCurrent(res)
        setLoading(false)
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [roomId])

  return (
    <CurrentReadingsPanel
      data={current}
      loading={loading}
      refreshEverySeconds={REFRESH_INTERVAL_MS / 1000}
    />
  )
}
