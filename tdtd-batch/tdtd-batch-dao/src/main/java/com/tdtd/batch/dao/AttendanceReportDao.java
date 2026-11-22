package com.tdtd.batch.dao;

import com.tdtd.batch.dao.model.ClassRow;
import com.tdtd.batch.dao.model.StudentRow;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public final class AttendanceReportDao {
  private static final String SESSION_ID_BY_USER_DATE_PERIOD =
      """
      SELECT id FROM attendance_sessions
      WHERE user_id = ? AND date = ? AND period = ?
      LIMIT 1
      """;

  private static final String LIST_CLASSES_BY_USER =
      """
      SELECT id, name, shift
      FROM classes
      WHERE user_id = ?
      ORDER BY name COLLATE NOCASE ASC
      """;

  private static final String LIST_STUDENTS_BY_CLASS_FOR_USER =
      """
      SELECT s.id, s.first_name, s.middle_name, s.last_name, s.class_id
      FROM students s
      INNER JOIN classes c ON c.id = s.class_id AND c.user_id = ?
      WHERE s.class_id = ?
      ORDER BY s.last_name COLLATE NOCASE ASC, s.first_name COLLATE NOCASE ASC
      """;

  private static final String LIST_PRESENT_STUDENT_IDS =
      """
      SELECT ar.student_id
      FROM attendance_records ar
      INNER JOIN attendance_sessions sess ON sess.id = ar.session_id
      WHERE ar.session_id = ? AND sess.user_id = ?
      """;

  public Optional<String> findSessionId(
      Connection conn, String userId, String date, String period) throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(SESSION_ID_BY_USER_DATE_PERIOD)) {
      ps.setString(1, userId);
      ps.setString(2, date);
      ps.setString(3, period);
      try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) {
          return Optional.of(rs.getString("id"));
        }
        return Optional.empty();
      }
    }
  }

  public List<ClassRow> listClassesByUser(Connection conn, String userId) throws SQLException {
    List<ClassRow> out = new ArrayList<>();
    try (PreparedStatement ps = conn.prepareStatement(LIST_CLASSES_BY_USER)) {
      ps.setString(1, userId);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          out.add(
              new ClassRow(
                  rs.getString("id"),
                  rs.getString("name"),
                  rs.getString("shift")));
        }
      }
    }
    return out;
  }

  public List<StudentRow> listStudentsByClass(
      Connection conn, String userId, String classId) throws SQLException {
    List<StudentRow> out = new ArrayList<>();
    try (PreparedStatement ps = conn.prepareStatement(LIST_STUDENTS_BY_CLASS_FOR_USER)) {
      ps.setString(1, userId);
      ps.setString(2, classId);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          out.add(mapStudent(rs));
        }
      }
    }
    return out;
  }

  public Set<String> listPresentStudentIds(
      Connection conn, String userId, String sessionId) throws SQLException {
    Set<String> out = new HashSet<>();
    try (PreparedStatement ps = conn.prepareStatement(LIST_PRESENT_STUDENT_IDS)) {
      ps.setString(1, sessionId);
      ps.setString(2, userId);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          out.add(rs.getString("student_id"));
        }
      }
    }
    return out;
  }

  private static StudentRow mapStudent(ResultSet rs) throws SQLException {
    String middle = rs.getString("middle_name");
    return new StudentRow(
        rs.getString("id"),
        rs.getString("first_name"),
        middle,
        rs.getString("last_name"),
        rs.getString("class_id"));
  }
}
