package com.tdtd.batch.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public final class AttendanceDao {
  private static final String SESSION_BY_USER_DATE_PERIOD =
      """
      SELECT id FROM attendance_sessions
      WHERE user_id = ? AND date = ? AND period = ?
      LIMIT 1
      """;

  public boolean sessionExists(
      Connection conn, String userId, String date, String period) throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(SESSION_BY_USER_DATE_PERIOD)) {
      ps.setString(1, userId);
      ps.setString(2, date);
      ps.setString(3, period);
      try (ResultSet rs = ps.executeQuery()) {
        return rs.next();
      }
    }
  }
}
