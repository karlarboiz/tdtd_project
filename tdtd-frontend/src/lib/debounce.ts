export type DebouncedCallback<T extends (...args: never[]) => void> = {
  schedule: (...args: Parameters<T>) => void
  flush: () => void
  cancel: () => void
}

export function createDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
): DebouncedCallback<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingArgs: Parameters<T> | null = null

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function runNow() {
    if (pendingArgs === null) return
    const args = pendingArgs
    pendingArgs = null
    clearTimer()
    fn(...args)
  }

  return {
    schedule(...args: Parameters<T>) {
      pendingArgs = args
      clearTimer()
      timer = setTimeout(runNow, delayMs)
    },
    flush() {
      runNow()
    },
    cancel() {
      pendingArgs = null
      clearTimer()
    },
  }
}
