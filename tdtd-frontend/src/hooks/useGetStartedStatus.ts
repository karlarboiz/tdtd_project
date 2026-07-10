import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getActiveSchoolYear,
  listSchoolYearSubjects,
} from '@/api/schoolYearApi'
import { ApiError } from '@/lib/http'
import type { SchoolYearRow } from '@/types/schema'

export function useGetStartedStatus() {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [schoolYear, setSchoolYear] = useState<SchoolYearRow | null>(null)
  const [subjectCount, setSubjectCount] = useState(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const year = await getActiveSchoolYear()
      setSchoolYear(year)
      const subjects = await listSchoolYearSubjects(year.id)
      setSubjectCount(subjects.length)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSchoolYear(null)
        setSubjectCount(0)
      } else {
        setSchoolYear(null)
        setSubjectCount(0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, location.pathname])

  const isComplete = schoolYear !== null && subjectCount >= 1

  return { loading, isComplete, schoolYear, subjectCount, refresh }
}
