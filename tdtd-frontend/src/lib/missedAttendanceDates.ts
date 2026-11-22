/** Unique calendar dates (YYYY-MM-DD) from missed due-list rows (AM/PM deduped). */
export function uniqueDatesFromMissedDueItems(
  items: ReadonlyArray<{ date: string }>,
): Set<string> {
  return new Set(items.map((item) => item.date))
}
