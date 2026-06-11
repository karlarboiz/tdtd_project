export const GOVERNMENT_HOLIDAY_QUERIES = {
  listByYear: `
    SELECT date, name, type, year, proclamation, source_url, fetched_at
    FROM government_holidays
    WHERE year = ?
    ORDER BY date
  `,
  listNonWorkingInRange: `
    SELECT date, name, type, year, proclamation, source_url, fetched_at
    FROM government_holidays
    WHERE date >= ? AND date <= ?
      AND type IN ('REGULAR', 'SPECIAL_NON_WORKING')
    ORDER BY date
  `,
  getByDate: `
    SELECT date, name, type, year, proclamation, source_url, fetched_at
    FROM government_holidays
    WHERE date = ?
    LIMIT 1
  `,
  countByYear: `
    SELECT COUNT(*) AS count FROM government_holidays WHERE year = ?
  `,
  maxFetchedAtByYear: `
    SELECT MAX(fetched_at) AS fetched_at
    FROM government_holidays
    WHERE year = ?
  `,
  deleteByYear: `DELETE FROM government_holidays WHERE year = ?`,
  insert: `
    INSERT INTO government_holidays (
      date, name, type, year, proclamation, source_url, fetched_at
    ) VALUES (
      @date, @name, @type, @year, @proclamation, @source_url, @fetched_at
    )
  `,
  isNonWorkingHoliday: `
    SELECT 1 AS ok
    FROM government_holidays
    WHERE date = ?
      AND type IN ('REGULAR', 'SPECIAL_NON_WORKING')
    LIMIT 1
  `,
} as const
