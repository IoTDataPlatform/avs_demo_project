import { Navigate, Route, Routes } from "react-router-dom"

import { HomePage } from "@/pages/HomePage"
import { RoomDetailPage } from "@/pages/RoomDetailPage"
import { SensorDetailPage } from "@/pages/SensorDetailPage"

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/rooms/:roomKey" element={<RoomDetailPage />} />
            <Route path="/sensors/:sensorId" element={<SensorDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}