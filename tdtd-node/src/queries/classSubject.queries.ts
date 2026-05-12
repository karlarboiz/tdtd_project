export const CLASS_SUBJECT_QUERIES = {
  listByClass: `
    SELECT
      cs.id,
      cs.class_id,
      cs.subject_id,
      cs.created_at,
      s.name AS subject_name,
      s.short_code AS subject_short_code
    FROM class_subjects cs
    INNER JOIN subjects s ON s.id = cs.subject_id
    WHERE cs.class_id = ?
    ORDER BY s.name COLLATE NOCASE ASC
  `,
  insert: `
    INSERT INTO class_subjects (id, class_id, subject_id, created_at)
    VALUES (@id, @class_id, @subject_id, @created_at)
  `,
  deletePair: `
    DELETE FROM class_subjects
    WHERE class_id = @class_id AND subject_id = @subject_id
  `,
  existsPair: `
    SELECT 1 AS ok FROM class_subjects
    WHERE class_id = ? AND subject_id = ?
    LIMIT 1
  `,
} as const
