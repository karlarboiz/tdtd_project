import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function RequireFreshPassword({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
        Loading…
      </div>
    )
  }

  if (user?.mustChangePassword) {
    return (
      <Navigate
        to="/change-password"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return <>{children}</>
}
