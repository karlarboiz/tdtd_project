/** SQL for school_settings (GAP-087). */

export const SCHOOL_SETTINGS_QUERIES = {
  get: `
    SELECT
      id,
      school_name,
      school_id,
      district,
      division,
      region,
      school_address,
      school_head_name,
      default_school_year_id,
      updated_at
    FROM school_settings
    ORDER BY updated_at DESC
    LIMIT 1
  `,
  upsert: `
    INSERT INTO school_settings (
      id, school_name, school_id, district, division, region,
      school_address, school_head_name, default_school_year_id, updated_at
    )
    VALUES (
      @id, @school_name, @school_id, @district, @division, @region,
      @school_address, @school_head_name, @default_school_year_id, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      school_name = excluded.school_name,
      school_id = excluded.school_id,
      district = excluded.district,
      division = excluded.division,
      region = excluded.region,
      school_address = excluded.school_address,
      school_head_name = excluded.school_head_name,
      default_school_year_id = excluded.default_school_year_id,
      updated_at = excluded.updated_at
  `,
} as const
