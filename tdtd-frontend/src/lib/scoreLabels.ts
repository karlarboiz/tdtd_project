import {
  EXAM_SUBTYPE_CODES,
  QUIZ_SUBTYPE_CODES,
  SCORE_EVENT_KIND,
  SCORE_EVENT_KIND_LABELS,
  SCORE_SUBTYPE_LABELS,
  type ScoreEventKindValue,
} from '@/constants/TDTDConstants'

export function formatScoreEventKindLabel(kind: ScoreEventKindValue): string {
  return SCORE_EVENT_KIND_LABELS[kind] ?? kind
}

export function formatSubtypeLabel(code: string): string {
  return SCORE_SUBTYPE_LABELS[code] ?? code
}

/** Default title when creating a score event from a subtype code. */
export function buildScoreEventTitle(
  kind: ScoreEventKindValue,
  subtypeCode?: string,
  subjectName?: string,
): string {
  const base =
    subtypeCode && SCORE_SUBTYPE_LABELS[subtypeCode]
      ? SCORE_SUBTYPE_LABELS[subtypeCode]
      : formatScoreEventKindLabel(kind)
  const subject = subjectName?.trim()
  return subject ? `${base} — ${subject}` : base
}

export function subtypeOptionsForKind(
  kind: ScoreEventKindValue,
): { code: string; label: string }[] {
  if (kind === SCORE_EVENT_KIND.QUIZ) {
    return QUIZ_SUBTYPE_CODES.map((code) => ({
      code,
      label: SCORE_SUBTYPE_LABELS[code] ?? code,
    }))
  }
  if (kind === SCORE_EVENT_KIND.EXAM) {
    return EXAM_SUBTYPE_CODES.map((code) => ({
      code,
      label: SCORE_SUBTYPE_LABELS[code] ?? code,
    }))
  }
  return []
}
