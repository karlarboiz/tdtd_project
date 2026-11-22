import type { AssessmentBucket, ScoreEventKind } from '../schema/types.js'

/** Quarterly exam subtype — maps to QA bucket. Keep in sync with frontend TDTDConstants. */
export const QUARTERLY_EXAM_SUBTYPE = 'QE'

const BUCKET_VALUES: AssessmentBucket[] = ['WW', 'PT', 'QA']

export function isAssessmentBucket(value: string): value is AssessmentBucket {
  return (BUCKET_VALUES as string[]).includes(value)
}

/**
 * Derive DepEd assessment bucket from event kind and optional UI subtype.
 * Teachers may pass an explicit override (e.g. PT for performance tasks).
 */
export function resolveAssessmentBucket(
  kind: ScoreEventKind,
  subtype?: string | null,
  override?: AssessmentBucket | null,
): AssessmentBucket {
  if (override) return override
  if (kind === 'EXAM' && subtype?.trim() === QUARTERLY_EXAM_SUBTYPE) return 'QA'
  return 'WW'
}
