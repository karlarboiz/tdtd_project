package com.tdtd.batch.dao;

import com.tdtd.batch.dao.model.ClassRow;
import com.tdtd.batch.dao.model.StudentRow;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/** JDBC reads for DepEd official form exports. */
public final class DepEdReportDao {

  public String getSchoolName(Connection conn, String userId) throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            """
            SELECT school_name FROM school_settings
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
            """)) {
      ps.setString(1, userId);
      try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) return rs.getString(1);
      }
    }
    return "School";
  }

  public ClassRow getClass(Connection conn, String userId, String classId) throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            """
            SELECT id, name, shift FROM classes
            WHERE id = ? AND user_id = ?
            """)) {
      ps.setString(1, classId);
      ps.setString(2, userId);
      try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) {
          return new ClassRow(
              rs.getString("id"),
              rs.getString("name"),
              rs.getString("shift"));
        }
      }
    }
    return null;
  }

  public List<StudentRow> listStudentsByClass(Connection conn, String userId, String classId)
      throws SQLException {
    List<StudentRow> list = new ArrayList<>();
    try (PreparedStatement ps =
        conn.prepareStatement(
            """
            SELECT s.id, s.first_name, s.middle_name, s.last_name, s.class_id
            FROM students s
            INNER JOIN classes c ON c.id = s.class_id AND c.user_id = ?
            WHERE s.class_id = ?
            ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE
            """)) {
      ps.setString(1, userId);
      ps.setString(2, classId);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          list.add(
              new StudentRow(
                  rs.getString("id"),
                  rs.getString("first_name"),
                  rs.getString("middle_name"),
                  rs.getString("last_name"),
                  rs.getString("class_id")));
        }
      }
    }
    return list;
  }
}
