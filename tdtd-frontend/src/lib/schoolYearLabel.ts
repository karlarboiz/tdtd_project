/** Philippine-style default SY label (June+ → Y-(Y+1), else (Y-1)-Y). */
export function defaultSchoolYearLabel(date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  if (m >= 6) return `${y}-${y + 1}`
  return `${y - 1}-${y}`
}
