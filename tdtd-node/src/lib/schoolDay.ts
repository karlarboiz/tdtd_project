import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { IsoDateString } from '../schema/types.js'
import { isNonWorkingGovernmentHoliday } from '../dao/governmentHoliday.dao.js'
import { getConfiguredTimezone, isWeekendYmd } from './timezone.js'

export function isSchoolDayYmd(
  db: SqliteDatabase,
  ymd: IsoDateString,
  timeZone = getConfiguredTimezone(),
): boolean {
  if (isWeekendYmd(ymd, timeZone)) return false
  if (isNonWorkingGovernmentHoliday(db, ymd)) return false
  return true
}
