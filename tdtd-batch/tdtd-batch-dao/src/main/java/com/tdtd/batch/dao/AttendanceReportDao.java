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
  private static final String SESSION_ID_BY_DATE_PERIOD =
      """
      SELECT id FROM attendance_sessions
      WHERE date = ? AND period = ?
      LIMIT 1
      """;

  private static final String LIST_ALL_CLASSES =
      """
      SELECT id, name, shift
      FROM classes
      ORDER BY name COLLATE NOCASE ASC
      """;

  private static final String LIST_STUDENTS_BY_CLASS =
      """
      SELECT id, first_name, middle_name, last_name, class_id
      FROM students
      WHERE class_id = ?
      ORDER BY last_name COLLATE NOCASE ASC, first_name COLLATE NOCASE ASC
      """;

  private static final String LIST_PRESENT_STUDENT_IDS =
      """
      SELECT student_id FROM attendance_records
      WHERE session_id = ?
      """;

  public Optional<String> findSessionId(Connection conn, String date, String period)
      throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(SESSION_ID_BY_DATE_PERIOD)) {
      ps.setString(1, date);
      ps.setString(2, period);
      try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) {
          return Optional.of(rs.getString("id"));
        }
        return Optional.empty();
      }
    }
  }

  public List<ClassRow> listAllClasses(Connection conn) throws SQLException {
    List<ClassRow> out = new ArrayList<>();
    try (PreparedStatement ps = conn.prepareStatement(LIST_ALL_CLASSES);
        ResultSet rs = ps.executeQuery()) {
      while (rs.next()) {
        out.add(
            new ClassRow(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("shift")));
      }
    }
    return out;
  }

  public List<StudentRow> listStudentsByClass(Connection conn, String classId) throws SQLException {
    List<StudentRow> out = new ArrayList<>();
    try (PreparedStatement ps = conn.prepareStatement(LIST_STUDENTS_BY_CLASS)) {
      ps.setString(1, classId);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          out.add(mapStudent(rs));
        }
      }
    }
    return out;
  }

  public Set<String> listPresentStudentIds(Connection conn, String sessionId) throws SQLException {
    Set<String> out = new HashSet<>();
    try (PreparedStatement ps = conn.prepareStatement(LIST_PRESENT_STUDENT_IDS)) {
      ps.setString(1, sessionId);
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
