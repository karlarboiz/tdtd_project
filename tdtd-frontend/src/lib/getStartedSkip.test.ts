import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearGetStartedSkipped,
  isGetStartedSkipped,
  setGetStartedSkipped,
} from './getStartedSkip'

const USER_A = 'user-a'
const USER_B = 'user-b'
const STORAGE_KEY = 'tdtd:get-started-skipped'

function createStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createStorage(),
    configurable: true,
  })
})

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY)
})

describe('getStartedSkip', () => {
  it('returns false when user has not skipped', () => {
    expect(isGetStartedSkipped(USER_A)).toBe(false)
    expect(isGetStartedSkipped(undefined)).toBe(false)
  })

  it('persists skip per user id', () => {
    setGetStartedSkipped(USER_A)
    expect(isGetStartedSkipped(USER_A)).toBe(true)
    expect(isGetStartedSkipped(USER_B)).toBe(false)
  })

  it('clears skip for one user', () => {
    setGetStartedSkipped(USER_A)
    setGetStartedSkipped(USER_B)
    clearGetStartedSkipped(USER_A)
    expect(isGetStartedSkipped(USER_A)).toBe(false)
    expect(isGetStartedSkipped(USER_B)).toBe(true)
  })
})
