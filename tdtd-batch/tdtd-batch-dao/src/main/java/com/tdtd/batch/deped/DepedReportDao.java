package com.tdtd.batch.deped;

import com.tdtd.batch.dao.AppDatabase;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Read-only roster, shift-matched attendance counts, and score history.
 * Not an official DepEd SF9/SF10 form. Does not compute weighted grades or term averages.
 */
public final class DepedReportDao {
    /**
     * Parameters in order: class id (twice), attendance window flag, from, to,
     * score window flag, from, to. A window flag of 0 means all dates.
     * Score events with a null date are excluded while a window is set.
     */
    private static final String SQL = """
            WITH roster AS (
                SELECT
                    students.id AS student_id,
                    students.first_name AS first_name,
                    students.middle_name AS middle_name,
                    students.last_name AS last_name,
                    classes.id AS class_id,
                    classes.name AS class_name,
                    classes.shift AS shift
                FROM students
                INNER JOIN classes ON classes.id = students.class_id
                WHERE (? IS NULL OR students.class_id = ?)
            ),
            attendance AS (
                SELECT
                    attendance_records.student_id AS student_id,
                    SUM(CASE WHEN attendance_records.status = 'present' THEN 1 ELSE 0 END) AS present_count,
                    SUM(CASE WHEN attendance_records.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
                    SUM(CASE WHEN attendance_records.status = 'late' THEN 1 ELSE 0 END) AS late_count
                FROM attendance_records
                INNER JOIN attendance_sessions
                    ON attendance_sessions.id = attendance_records.session_id
                INNER JOIN roster
                    ON roster.student_id = attendance_records.student_id
                WHERE (
                        (roster.shift = 'MRNG' AND attendance_sessions.period = 'AM')
                        OR (roster.shift = 'AFTNN' AND attendance_sessions.period = 'PM')
                    )
                    AND (
                        ? = 0
                        OR (
                            attendance_sessions.date >= ?
                            AND attendance_sessions.date <= ?
                        )
                    )
                GROUP BY attendance_records.student_id
            ),
            scores AS (
                SELECT
                    score_entries.student_id AS student_id,
                    subjects.name AS subject_name,
                    score_events.kind AS score_kind,
                    score_events.title AS score_title,
                    score_events.date AS score_date,
                    score_entries.score AS score,
                    score_events.max_score AS max_score
                FROM score_entries
                INNER JOIN score_events ON score_events.id = score_entries.event_id
                INNER JOIN roster
                    ON roster.student_id = score_entries.student_id
                    AND roster.class_id = score_events.class_id
                LEFT JOIN subjects ON subjects.id = score_events.subject_id
                WHERE (
                    ? = 0
                    OR (
                        score_events.date IS NOT NULL
                        AND score_events.date >= ?
                        AND score_events.date <= ?
                    )
                )
            )
            SELECT
                roster.class_name AS class_name,
                roster.shift AS shift,
                roster.student_id AS student_id,
                roster.last_name AS last_name,
                roster.first_name AS first_name,
                roster.middle_name AS middle_name,
                COALESCE(attendance.present_count, 0) AS attendance_present,
                COALESCE(attendance.absent_count, 0) AS attendance_absent,
                COALESCE(attendance.late_count, 0) AS attendance_late,
                scores.subject_name AS subject_name,
                scores.score_kind AS score_kind,
                scores.score_title AS score_title,
                scores.score_date AS score_date,
                scores.score AS score,
                scores.max_score AS max_score
            FROM roster
            LEFT JOIN attendance ON attendance.student_id = roster.student_id
            LEFT JOIN scores ON scores.student_id = roster.student_id
            ORDER BY
                roster.class_name,
                roster.last_name,
                roster.first_name,
                scores.subject_name,
                scores.score_date,
                scores.score_title
            """;

    private DepedReportDao() {
    }

    public static List<DepedReportRow> load(String classId, LocalDate from, LocalDate to) throws SQLException {
        if ((from == null) != (to == null)) {
            throw new IllegalArgumentException("Set both from and to (YYYY-MM-DD), or leave both blank");
        }
        if (from != null && from.isAfter(to)) {
            throw new IllegalArgumentException("from is after to");
        }
        String classFilter = classId == null || classId.isBlank() ? null : classId.trim();
        int window = from == null ? 0 : 1;
        String fromText = from == null ? null : from.toString();
        String toText = to == null ? null : to.toString();

        try (Connection connection = AppDatabase.open()) {
            try (PreparedStatement statement = connection.prepareStatement(SQL)) {
                statement.setString(1, classFilter);
                statement.setString(2, classFilter);
                statement.setInt(3, window);
                statement.setString(4, fromText);
                statement.setString(5, toText);
                statement.setInt(6, window);
                statement.setString(7, fromText);
                statement.setString(8, toText);
                try (ResultSet resultSet = statement.executeQuery()) {
                    List<DepedReportRow> rows = new ArrayList<>();
                    while (resultSet.next()) {
                        rows.add(map(resultSet));
                    }
                    return rows;
                }
            }
        }
    }

    private static DepedReportRow map(ResultSet resultSet) throws SQLException {
        return new DepedReportRow(
                resultSet.getString("class_name"),
                resultSet.getString("shift"),
                resultSet.getString("student_id"),
                resultSet.getString("last_name"),
                resultSet.getString("first_name"),
                resultSet.getString("middle_name"),
                resultSet.getInt("attendance_present"),
                resultSet.getInt("attendance_absent"),
                resultSet.getInt("attendance_late"),
                resultSet.getString("subject_name"),
                resultSet.getString("score_kind"),
                resultSet.getString("score_title"),
                resultSet.getString("score_date"),
                readNullableDouble(resultSet, "score"),
                readNullableDouble(resultSet, "max_score"));
    }

    private static Double readNullableDouble(ResultSet resultSet, String column) throws SQLException {
        double value = resultSet.getDouble(column);
        return resultSet.wasNull() ? null : value;
    }
}
