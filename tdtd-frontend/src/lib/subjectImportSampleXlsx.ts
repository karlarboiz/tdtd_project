import * as XLSX from 'xlsx'

export const SUBJECT_IMPORT_HEADERS = ['Name', 'Short Code', 'Grade Level'] as const

const SAMPLE_ROWS: string[][] = [
  ['Mathematics', 'MATH', 'Grade 5'],
  ['English', 'ENG', 'Grade 5'],
  ['Science', 'SCI', 'Grade 6'],
]

export function downloadSubjectImportSample(
  filename = 'subject-import-sample.xlsx',
): void {
  const wb = XLSX.utils.book_new()
  const aoa = [SUBJECT_IMPORT_HEADERS as unknown as string[], ...SAMPLE_ROWS]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, ws, 'Subjects')
  XLSX.writeFile(wb, filename)
}
