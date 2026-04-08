import { Navigate, Route, Routes } from "react-router-dom"

import { HomePage } from "@/pages/HomePage"
import { RoomDetailPage } from "@/pages/RoomDetailPage"

function App() {
  return (
    <Routes>
      {/* пока заглушка HomePage */}
      <Route path="/" element={<HomePage />} />
      <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
