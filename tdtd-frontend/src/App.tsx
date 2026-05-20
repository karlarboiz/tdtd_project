import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { AttendanceCalendar } from './pages/AttendanceCalendar/AttendanceCalendar'
import { AttendanceSession } from './pages/AttendanceSession/AttendanceSession'
import { Classes } from './pages/Classes/Classes'
import { Home } from './pages/Home/Home'
import { Subjects } from './pages/Subjects/Subjects'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/attendance" element={<AttendanceCalendar />} />
          <Route path="/attendance/session/:date" element={<AttendanceSession />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/subjects" element={<Subjects />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
