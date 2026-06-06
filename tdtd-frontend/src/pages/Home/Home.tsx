import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { DueList } from '@/components/DueList/DueList'
import { MissedWorkSummary } from '@/components/MissedWorkSummary/MissedWorkSummary'
import { StudentLabShortcut } from '@/components/StudentLabShortcut/StudentLabShortcut'
import { TodayAttendanceCTA } from '@/components/TodayAttendanceCTA/TodayAttendanceCTA'
import { useDueItems } from '@/hooks/useDueItems'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function Home() {
  const { items, loading, dismiss } = useDueItems()

  return (
    <PageContainer>
      <PageContentReveal>
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">{getGreeting()}</h1>
          <p className="mt-1 text-sm text-slate-600">{formatTodayDate()}</p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <DueList
            showEmptyState
            items={items}
            loading={loading}
            onDismiss={dismiss}
          />
          <TodayAttendanceCTA dueItems={items} loading={loading} />
        </div>
        <div className="flex flex-col gap-6">
          <MissedWorkSummary />
          <StudentLabShortcut />
        </div>
        </div>
      </PageContentReveal>
    </PageContainer>
  )
}
