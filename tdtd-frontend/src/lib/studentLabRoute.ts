/** Path for a student's lab detail view. */
export function studentLabPath(studentId: string): string {
  return `/student-lab/${encodeURIComponent(studentId)}`
}
