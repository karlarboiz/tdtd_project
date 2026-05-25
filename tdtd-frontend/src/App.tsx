import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { AttendanceCalendar } from './pages/AttendanceCalendar/AttendanceCalendar'
import { AttendanceSession } from './pages/AttendanceSession/AttendanceSession'
import { Classes } from './pages/Classes/Classes'
import { Home } from './pages/Home/Home'
import { ScoreGrading } from './pages/ScoreGrading/ScoreGrading'
import { Scores } from './pages/Scores/Scores'
import { Subjects } from './pages/Subjects/Subjects'
import { Recents } from './pages/Recents/Recents'

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
          <Route path="/scores" element={<Scores />} />
          <Route path="/scores/event/:eventId" element={<ScoreGrading />} />
          <Route path="/recents" element={<Recents />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
