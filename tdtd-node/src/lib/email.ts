const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmailFormat(email: string): boolean {
  const n = normalizeEmail(email)
  return n.length >= 3 && n.length <= 254 && EMAIL_RE.test(n)
}
