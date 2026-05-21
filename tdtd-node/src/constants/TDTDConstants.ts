/**
 * Static codes for score_events.kind — keep in sync with tdtd-frontend/src/constants/TDTDConstants.ts
 */

export const SCORE_EVENT_KIND = {
  QUIZ: 'QUIZ',
  EXAM: 'EXAM',
  PARTICIPATION: 'PARTICIPATION',
} as const

export type ScoreEventKindValue =
  (typeof SCORE_EVENT_KIND)[keyof typeof SCORE_EVENT_KIND]

export const SCORE_EVENT_KIND_VALUES: ScoreEventKindValue[] = [
  SCORE_EVENT_KIND.QUIZ,
  SCORE_EVENT_KIND.EXAM,
  SCORE_EVENT_KIND.PARTICIPATION,
]
