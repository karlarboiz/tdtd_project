const STORAGE_KEY = 'tdtd:get-started-skipped'

function readMap(): Record<string, true> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, true>
    }
  } catch {
    // ignore corrupt storage
  }
  return {}
}

function writeMap(map: Record<string, true>): void {
  if (Object.keys(map).length === 0) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function isGetStartedSkipped(userId: string | undefined): boolean {
  if (!userId) return false
  return readMap()[userId] === true
}

export function setGetStartedSkipped(userId: string): void {
  const map = readMap()
  map[userId] = true
  writeMap(map)
}

export function clearGetStartedSkipped(userId: string | undefined): void {
  if (!userId) return
  const map = readMap()
  if (!(userId in map)) return
  delete map[userId]
  writeMap(map)
}
