import { Button } from '@/components/Button/Button'
import { CardSkeleton } from '@/components/LoadingSkeleton/CardSkeleton'
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
      <Button to={firstDue.actionPath} size="lg" fullWidth>
        {firstDue.title}
      </Button>
    )
  }

  return (
    <Button to="/attendance" variant="tile">
      View attendance calendar
    </Button>
  )
}
