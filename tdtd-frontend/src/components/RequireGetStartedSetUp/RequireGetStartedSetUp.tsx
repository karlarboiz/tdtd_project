import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useGetStartedStatus } from '@/hooks/useGetStartedStatus'
import { isGetStartedSkipped } from '@/lib/getStartedSkip'

const GET_STARTED_PATH = '/get-started'

export function RequireGetStartedSetUp({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const { loading: statusLoading, isComplete } = useGetStartedStatus()

  if (authLoading || statusLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
        Loading…
      </div>
    )
  }

  if (isComplete || isGetStartedSkipped(user?.id)) {
    return <>{children}</>
  }

  if (location.pathname === GET_STARTED_PATH) {
    return <>{children}</>
  }

  return (
    <Navigate
      to={GET_STARTED_PATH}
      replace
      state={{ from: location.pathname }}
    />
  )
}
