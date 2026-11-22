import type {
  AssessmentBucket,
  ClassSubjectRow,
  ScoreEntryRow,
  ScoreEventKind,
  ScoreEventRow,
} from '@/types/schema'
import { apiJson } from '../lib/http'

export function listClassSubjects(classId: string): Promise<ClassSubjectRow[]> {
  return apiJson<ClassSubjectRow[]>(`/api/classes/${encodeURIComponent(classId)}/subjects`)
}

export function assignSubjectToClass(
  classId: string,
  subjectId: string,
): Promise<ClassSubjectRow> {
  return apiJson<ClassSubjectRow>(
    `/api/classes/${encodeURIComponent(classId)}/subjects`,
    {
      method: 'POST',
      body: JSON.stringify({ subjectId }),
    },
  )
}

export function removeSubjectFromClass(
  classId: string,
  subjectId: string,
): Promise<void> {
  return apiJson<void>(
    `/api/classes/${encodeURIComponent(classId)}/subjects/${encodeURIComponent(subjectId)}`,
    { method: 'DELETE' },
  )
}

export function assignClassSubject(
  classId: string,
  subjectId: string,
): Promise<ClassSubjectRow> {
  return apiJson<ClassSubjectRow>(
    `/api/classes/${encodeURIComponent(classId)}/subjects`,
    {
      method: 'POST',
      body: JSON.stringify({ subjectId }),
    },
  )
}

export async function removeClassSubject(
  classId: string,
  subjectId: string,
): Promise<void> {
  await apiJson<void>(
    `/api/classes/${encodeURIComponent(classId)}/subjects/${encodeURIComponent(subjectId)}`,
    { method: 'DELETE' },
  )
}

export function listScoreEvents(
  classId: string,
  subjectId?: string,
): Promise<ScoreEventRow[]> {
  const q = subjectId
    ? `?${new URLSearchParams({ subjectId }).toString()}`
    : ''
  return apiJson<ScoreEventRow[]>(
    `/api/classes/${encodeURIComponent(classId)}/score-events${q}`,
  )
}

export function createScoreEvent(
  classId: string,
  input: {
    subjectId: string
    kind: ScoreEventKind
    title: string
    date?: string
    maxScore?: number
    quarter: number
    subtype?: string
    assessmentBucket?: AssessmentBucket
  },
): Promise<ScoreEventRow> {
  return apiJson<ScoreEventRow>(
    `/api/classes/${encodeURIComponent(classId)}/score-events`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function getScoreEvent(eventId: string): Promise<ScoreEventRow> {
  return apiJson<ScoreEventRow>(
    `/api/score-events/${encodeURIComponent(eventId)}`,
  )
}

export function listScoreEntries(eventId: string): Promise<ScoreEntryRow[]> {
  return apiJson<ScoreEntryRow[]>(
    `/api/score-events/${encodeURIComponent(eventId)}/entries`,
  )
}

export function saveScoreEntries(
  eventId: string,
  entries: { studentId: string; score: number | null; note?: string }[],
): Promise<ScoreEntryRow[]> {
  return apiJson<ScoreEntryRow[]>(
    `/api/score-events/${encodeURIComponent(eventId)}/entries`,
    {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    },
  )
}
