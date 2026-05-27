package com.tdtd.batch.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

public final class TeacherReminderDao {
  private static final String TYPE_ATTENDANCE = "ATTENDANCE_DUE";

  private static final String FIND_OPEN =
      """
      SELECT id FROM teacher_reminders
      WHERE type = ? AND date = ? AND period = ? AND status = 'open'
      LIMIT 1
      """;

  private static final String INSERT =
      """
      INSERT INTO teacher_reminders (
        id, type, date, period, status, message, created_at, resolved_at
      ) VALUES (?, ?, ?, ?, 'open', ?, ?, NULL)
      """;

  private static final String RESOLVE_OPEN =
      """
      UPDATE teacher_reminders
      SET status = 'resolved', resolved_at = ?
      WHERE type = ? AND date = ? AND period = ? AND status = 'open'
      """;

  public boolean hasOpen(Connection conn, String date, String period) throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(FIND_OPEN)) {
      ps.setString(1, TYPE_ATTENDANCE);
      ps.setString(2, date);
      ps.setString(3, period);
      try (ResultSet rs = ps.executeQuery()) {
        return rs.next();
      }
    }
  }

  public void insertOpen(Connection conn, String date, String period, String message, long createdAt)
      throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(INSERT)) {
      ps.setString(1, UUID.randomUUID().toString());
      ps.setString(2, TYPE_ATTENDANCE);
      ps.setString(3, date);
      ps.setString(4, period);
      ps.setString(5, message);
      ps.setLong(6, createdAt);
      ps.executeUpdate();
    }
  }

  public int resolveOpen(Connection conn, String date, String period, long resolvedAt)
      throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(RESOLVE_OPEN)) {
      ps.setLong(1, resolvedAt);
      ps.setString(2, TYPE_ATTENDANCE);
      ps.setString(3, date);
      ps.setString(4, period);
      return ps.executeUpdate();
    }
  }
}
