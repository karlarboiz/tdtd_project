import { Link } from 'react-router-dom'
import { CardSkeleton } from '@/components/LoadingSkeleton/CardSkeleton'
import { primaryButtonClass, secondaryLinkTileClass } from '@/lib/uiClasses'
import type { DueItem } from '@/types/schema'

type TodayAttendanceCTAProps = {
  dueItems: DueItem[]
  loading: boolean
}

export function TodayAttendanceCTA({
  dueItems,
  loading,
}: TodayAttendanceCTAProps) {
  if (loading) {
    return <CardSkeleton variant="button" />
  }

  const firstDue = dueItems[0]

  if (firstDue) {
    return (
      <Link
        to={firstDue.actionPath}
        className={`block rounded-2xl px-5 py-4 text-center text-lg ${primaryButtonClass}`}
      >
        {firstDue.title}
      </Link>
    )
  }

  return (
    <Link to="/attendance" className={secondaryLinkTileClass}>
      View attendance calendar
    </Link>
  )
}
