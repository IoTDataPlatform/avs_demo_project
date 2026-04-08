import { Link } from "react-router-dom"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Заглушка - `/rooms/:roomId` */
const DEV_ROOM_LINKS = [
  { id: "room_2128", label: "room_2128 (пример)" },
  { id: "room_2123", label: "room_2123 (пример)" },
  { id: "room_lab_101", label: "room_lab_101 (пример)" },
] as const

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Главная</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Карта с выбором здания/аудитории будет позже
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Локальная проверка страницы аудитории</CardTitle>
          <CardDescription>
            Прямые ссылки на маршрут детальной страницы.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {DEV_ROOM_LINKS.map(({ id, label }) => (
            <Link
              key={id}
              to={`/rooms/${id}`}
              className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-bg-secondary)]"
            >
              {label}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
