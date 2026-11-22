import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/RequireAuth/RequireAuth'
import { RequireFreshPassword } from '@/components/RequireFreshPassword/RequireFreshPassword'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppShell } from './layouts/AppShell'
import { AttendanceCalendar } from './pages/AttendanceCalendar/AttendanceCalendar'
import { AttendanceSession } from './pages/AttendanceSession/AttendanceSession'
import { Classes } from './pages/Classes/Classes'
import { ChangePassword } from './pages/ChangePassword/ChangePassword'
import { ForgotPassword } from './pages/ForgotPassword/ForgotPassword'
import { Home } from './pages/Home/Home'
import { Login } from './pages/Login/Login'
import { ResetPassword } from './pages/ResetPassword/ResetPassword'
import { Signup } from './pages/Signup/Signup'
import { ScoreGrading } from './pages/ScoreGrading/ScoreGrading'
import { Scores } from './pages/Scores/Scores'
import { Subjects } from './pages/Subjects/Subjects'
import { Recents } from './pages/Recents/Recents'
import { StudentLab } from './pages/StudentLab/StudentLab'
import { StudentLabPicker } from './pages/StudentLabPicker/StudentLabPicker'
import { DueListPage } from './pages/DueList/DueListPage'
import { ComponentWeights } from './pages/ComponentWeights/ComponentWeights'
import { Reports } from './pages/Reports/Reports'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/change-password"
            element={
              <RequireAuth>
                <ChangePassword />
              </RequireAuth>
            }
          />
          <Route
            element={
              <RequireAuth>
                <RequireFreshPassword>
                  <AppShell />
                </RequireFreshPassword>
              </RequireAuth>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/due-list" element={<DueListPage />} />
            <Route path="/attendance" element={<AttendanceCalendar />} />
            <Route
              path="/attendance/session/:date"
              element={<AttendanceSession />}
            />
            <Route path="/classes" element={<Classes />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/scores" element={<Scores />} />
            <Route path="/scores/event/:eventId" element={<ScoreGrading />} />
            <Route path="/recents" element={<Recents />} />
            <Route path="/student-lab" element={<StudentLabPicker />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/deped/component-weights" element={<ComponentWeights />} />
            <Route path="/student-lab/:studentId" element={<StudentLab />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
