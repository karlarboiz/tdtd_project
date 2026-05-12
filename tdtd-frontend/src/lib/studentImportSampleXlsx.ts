import * as XLSX from 'xlsx'

/** Column headers teachers should keep in row 1 (order can vary; names are matched flexibly). */
export const STUDENT_IMPORT_HEADERS = [
  'First Name',
  'Middle Name',
  'Last Name',
  'Birth Date',
  'Gender',
] as const

const SAMPLE_ROWS: (string | number)[][] = [
  
]

/** Triggers browser download of a sample .xlsx for student roster import. */
export function downloadStudentImportSample(
  filename = 'student-roster-import-sample.xlsx',
): void {
  const wb = XLSX.utils.book_new()
  const aoa = [STUDENT_IMPORT_HEADERS as unknown as string[], ...SAMPLE_ROWS]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, filename)
}
