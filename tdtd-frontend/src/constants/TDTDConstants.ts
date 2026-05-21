/**
 * Static codes and labels for scores (quiz, exam, participation).
 * Subtype codes (RZ, WZ, …) are for UI/title labeling; DB kind is QUIZ | EXAM | PARTICIPATION.
 */

/** Stored on score_events.kind (SQLite CHECK). */
export const SCORE_EVENT_KIND = {
  QUIZ: 'QUIZ',
  EXAM: 'EXAM',
  PARTICIPATION: 'PARTICIPATION',
} as const

export type ScoreEventKindValue =
  (typeof SCORE_EVENT_KIND)[keyof typeof SCORE_EVENT_KIND]

/** Quiz subtype short codes (UI / default titles). */
export const REGULAR_QUIZ = 'RZ'
export const QUARTERLY_QUIZ = 'QZ'
export const WEEKLY_QUIZ = 'WZ'

/** Exam subtype short codes. */
export const QUARTERLY_EXAM = 'QE'

export const QUIZ_SUBTYPE_CODES = [
  REGULAR_QUIZ,
  QUARTERLY_QUIZ,
  WEEKLY_QUIZ,
] as const

export type QuizSubtypeCode = (typeof QUIZ_SUBTYPE_CODES)[number]

export const EXAM_SUBTYPE_CODES = [QUARTERLY_EXAM] as const

export type ExamSubtypeCode = (typeof EXAM_SUBTYPE_CODES)[number]

/** Human-readable labels keyed by subtype code. */
export const SCORE_SUBTYPE_LABELS: Record<string, string> = {
  [REGULAR_QUIZ]: 'Regular Quiz',
  [QUARTERLY_QUIZ]: 'Quarterly Quiz',
  [WEEKLY_QUIZ]: 'Weekly Quiz',
  [QUARTERLY_EXAM]: 'Quarterly Exam',
}

export const SCORE_EVENT_KIND_LABELS: Record<ScoreEventKindValue, string> = {
  [SCORE_EVENT_KIND.QUIZ]: 'Quiz',
  [SCORE_EVENT_KIND.EXAM]: 'Exam',
  [SCORE_EVENT_KIND.PARTICIPATION]: 'Participation',
}
