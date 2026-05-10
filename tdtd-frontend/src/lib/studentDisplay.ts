import type { StudentRow } from '../types/schema'

/** Display order: first middle last (omit empty middle). */
export function formatStudentName(
  s: Pick<StudentRow, 'firstName' | 'lastName'> & {
    middleName?: string
  },
): string {
  return [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ')
}
