import * as XLSX from 'xlsx'
import type { StudentUpsertPayload } from '../types/schema'

type ColKey =
  | 'firstName'
  | 'middleName'
  | 'lastName'
  | 'birthDate'
  | 'gender'

/** Normalized header (lowercase, no spaces) → logical column key. */
const HEADER_MAP: Record<string, ColKey> = {
  firstname: 'firstName',
  fname: 'firstName',
  first: 'firstName',
  middlename: 'middleName',
  middle: 'middleName',
  mi: 'middleName',
  lastname: 'lastName',
  lname: 'lastName',
  last: 'lastName',
  surname: 'lastName',
  birthdate: 'birthDate',
  dateofbirth: 'birthDate',
  dob: 'birthDate',
  gender: 'gender',
  sex: 'gender',
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function normalizeHeader(cell: unknown): string {
  return String(cell ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function excelSerialToIso(n: number): string {
  const epochMs = Math.round((n - 25569) * 86400 * 1000)
  const d = new Date(epochMs)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function cellToRawString(cell: unknown): string {
  if (cell == null) return ''
  if (cell instanceof Date) {
    const y = cell.getFullYear()
    const m = cell.getMonth() + 1
    const d = cell.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  if (typeof cell === 'number') {
    if (Number.isFinite(cell) && cell > 20000 && cell < 60000) {
      return excelSerialToIso(cell)
    }
    return String(cell)
  }
  return String(cell).trim()
}

function parseBirthDateHint(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (ISO_DATE.test(s)) return s
  /** e.g. 5/14/2012 → try locale parse */
  const tryDate = new Date(s)
  if (!Number.isNaN(tryDate.getTime())) {
    const y = tryDate.getFullYear()
    const m = tryDate.getMonth() + 1
    const d = tryDate.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return null
}

export function normalizeGenderClient(raw: string): 'M' | 'F' | 'O' | null {
  const x = raw.trim().toUpperCase()
  if (x === 'M' || x === 'MALE') return 'M'
  if (x === 'F' || x === 'FEMALE') return 'F'
  if (x === 'O' || x === 'OTHER') return 'O'
  return null
}

export type StudentImportResult = {
  students: StudentUpsertPayload[]
  errors: string[]
}

/**
 * Parses the first worksheet: row 1 = headers (firstName, middleName, lastName,
 * birthDate, gender — synonyms accepted); following rows are data.
 */
export function parseStudentImportWorkbook(wb: XLSX.WorkBook): StudentImportResult {
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    return { students: [], errors: ['The workbook has no sheets.'] }
  }
  const sheet = wb.Sheets[sheetName]
  if (!sheet) {
    return { students: [], errors: ['Could not read the first sheet.'] }
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | Date | undefined)[]>(
    sheet,
    { header: 1, defval: '', raw: true },
  ) as unknown[][]

  if (rows.length < 2) {
    return {
      students: [],
      errors: [
        'Add a header row and at least one data row (see sample file).',
      ],
    }
  }

  const headerCells = rows[0] ?? []
  const col: Partial<Record<ColKey, number>> = {}
  for (let i = 0; i < headerCells.length; i++) {
    const key = HEADER_MAP[normalizeHeader(headerCells[i])]
    if (key) col[key] = i
  }

  const requiredKeys: ColKey[] = ['firstName', 'lastName', 'birthDate', 'gender']
  const missingHeaders = requiredKeys.filter((k) => col[k] === undefined)
  if (missingHeaders.length > 0) {
    return {
      students: [],
      errors: [
        `Missing required column header(s): ${missingHeaders.join(', ')}. Use the sample file headers as a guide.`,
      ],
    }
  }

  const students: StudentUpsertPayload[] = []
  const errors: string[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const get = (k: ColKey): string =>
      cellToRawString(col[k] !== undefined ? row[col[k] as number] : '')

    const firstName = get('firstName')
    const middleName = col.middleName !== undefined ? get('middleName') : ''
    const lastName = get('lastName')
    let birthRaw = get('birthDate')
    let genderRaw = get('gender')

    if (
      firstName.trim() === '' &&
      lastName.trim() === '' &&
      birthRaw.trim() === '' &&
      genderRaw.trim() === '' &&
      (!middleName || middleName.trim() === '')
    ) {
      continue
    }

    const fileRow = r + 1
    if (!firstName.trim()) {
      errors.push(`Row ${fileRow}: firstName is required.`)
      continue
    }
    if (!lastName.trim()) {
      errors.push(`Row ${fileRow}: lastName is required.`)
      continue
    }

    const parsedDate = parseBirthDateHint(birthRaw)
    if (!parsedDate) {
      errors.push(
        `Row ${fileRow}: birthDate must be a real date (use YYYY-MM-DD in the sample).`,
      )
      continue
    }

    const gender = normalizeGenderClient(genderRaw)
    if (!gender) {
      errors.push(
        `Row ${fileRow}: gender must be M / F / O (or Male / Female / Other).`,
      )
      continue
    }

    students.push({
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      birthDate: parsedDate,
      gender,
    })
  }

  if (students.length === 0 && errors.length === 0) {
    errors.push('No student rows found after the header (empty file?).')
  }

  return { students, errors }
}

/** Validate a single form row before Add / save (gender may already be M|F|O from a select). */
export function tryBuildStudentDraft(d: {
  firstName: string
  middleName: string
  lastName: string
  birthDate: string
  gender: string
}): { ok: StudentUpsertPayload } | { error: string } {
  if (!d.firstName.trim()) return { error: 'First name is required.' }
  if (!d.lastName.trim()) return { error: 'Last name is required.' }
  const bd = parseBirthDateHint(d.birthDate.trim())
  if (!bd)
    return { error: 'Use a valid birth date (YYYY-MM-DD is best).' }
  const g = normalizeGenderClient(d.gender)
  if (!g)
    return { error: 'Choose gender M / F / O (or type Male/Female/Other).' }
  return {
    ok: {
      firstName: d.firstName.trim(),
      middleName: d.middleName.trim() || undefined,
      lastName: d.lastName.trim(),
      birthDate: bd,
      gender: g,
    },
  }
}

