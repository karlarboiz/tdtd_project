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

  public String getSchoolName(Connection conn) throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "SELECT school_name FROM school_settings ORDER BY updated_at DESC LIMIT 1")) {
      try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) return rs.getString(1);
      }
    }
    return "School";
  }

  public ClassRow getClass(Connection conn, String classId) throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "SELECT id, name, shift FROM classes WHERE id = ?")) {
      ps.setString(1, classId);
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

  public List<StudentRow> listStudentsByClass(Connection conn, String classId)
      throws SQLException {
    List<StudentRow> list = new ArrayList<>();
    try (PreparedStatement ps =
        conn.prepareStatement(
            """
            SELECT id, first_name, middle_name, last_name, class_id
            FROM students
            WHERE class_id = ?
            ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE
            """)) {
      ps.setString(1, classId);
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
