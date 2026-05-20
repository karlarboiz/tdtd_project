import * as XLSX from 'xlsx'

export type SubjectImportRow = {
  name: string
  shortCode?: string
  gradeLevel: string
}

type ColKey = 'name' | 'shortCode' | 'gradeLevel'

const HEADER_MAP: Record<string, ColKey> = {
  name: 'name',
  subject: 'name',
  subjectname: 'name',
  title: 'name',
  shortcode: 'shortCode',
  code: 'shortCode',
  abbreviation: 'shortCode',
  abbr: 'shortCode',
  gradelevel: 'gradeLevel',
  grade: 'gradeLevel',
  level: 'gradeLevel',
  yearlevel: 'gradeLevel',
}

function normalizeHeader(cell: unknown): string {
  return String(cell ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function cellToString(cell: unknown): string {
  if (cell == null) return ''
  return String(cell).trim()
}

export type SubjectImportResult = {
  subjects: SubjectImportRow[]
  errors: string[]
}

/**
 * Row 1 = headers (name, gradeLevel required; shortCode optional). Synonyms accepted.
 */
export function parseSubjectImportWorkbook(wb: XLSX.WorkBook): SubjectImportResult {
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    return { subjects: [], errors: ['The workbook has no sheets.'] }
  }
  const sheet = wb.Sheets[sheetName]
  if (!sheet) {
    return { subjects: [], errors: ['Could not read the first sheet.'] }
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][]

  if (rows.length < 2) {
    return {
      subjects: [],
      errors: ['Add a header row and at least one data row (see sample file).'],
    }
  }

  const headerCells = rows[0] ?? []
  const col: Partial<Record<ColKey, number>> = {}
  for (let i = 0; i < headerCells.length; i++) {
    const key = HEADER_MAP[normalizeHeader(headerCells[i])]
    if (key) col[key] = i
  }

  const missing: string[] = []
  if (col.name === undefined) missing.push('name')
  if (col.gradeLevel === undefined) missing.push('gradeLevel')
  if (missing.length > 0) {
    return {
      subjects: [],
      errors: [
        `Missing required column header(s): ${missing.join(', ')}. Use the sample file as a guide.`,
      ],
    }
  }

  const subjects: SubjectImportRow[] = []
  const errors: string[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const get = (k: ColKey): string =>
      cellToString(col[k] !== undefined ? row[col[k] as number] : '')

    const name = get('name')
    const gradeLevel = get('gradeLevel')
    const shortCode = col.shortCode !== undefined ? get('shortCode') : ''

    if (!name && !gradeLevel && !shortCode) continue

    const fileRow = r + 1
    if (!name) {
      errors.push(`Row ${fileRow}: name is required.`)
      continue
    }
    if (!gradeLevel) {
      errors.push(`Row ${fileRow}: grade level is required.`)
      continue
    }

    subjects.push({
      name,
      gradeLevel,
      shortCode: shortCode || undefined,
    })
  }

  if (subjects.length === 0 && errors.length === 0) {
    errors.push('No subject rows found after the header (empty file?).')
  }

  return { subjects, errors }
}
