import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Заглушка маршрута `/rooms/:roomId`
 */
export function RoomDetailPage() {
  const { roomId = "" } = useParams()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
        <Link to="/">
          <ArrowLeft className="size-4" />
          На главную
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Аудитория {roomId || "—"}</CardTitle>
          <CardDescription>
            Детальная страница (показания, история, статистика) - позже.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Данные для этой страницы описаны в{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">src/api/types.ts</code> и заглушках{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">src/api/mockClient.ts</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
