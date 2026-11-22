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
      WHERE user_id = ? AND type = ? AND date = ? AND period = ? AND status = 'open'
      LIMIT 1
      """;

  private static final String INSERT =
      """
      INSERT INTO teacher_reminders (
        id, user_id, type, date, period, status, message, created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, NULL)
      """;

  private static final String RESOLVE_OPEN =
      """
      UPDATE teacher_reminders
      SET status = 'resolved', resolved_at = ?
      WHERE user_id = ? AND type = ? AND date = ? AND period = ? AND status = 'open'
      """;

  public boolean hasOpen(Connection conn, String userId, String date, String period)
      throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(FIND_OPEN)) {
      ps.setString(1, userId);
      ps.setString(2, TYPE_ATTENDANCE);
      ps.setString(3, date);
      ps.setString(4, period);
      try (ResultSet rs = ps.executeQuery()) {
        return rs.next();
      }
    }
  }

  public void insertOpen(
      Connection conn,
      String userId,
      String date,
      String period,
      String message,
      long createdAt)
      throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(INSERT)) {
      ps.setString(1, UUID.randomUUID().toString());
      ps.setString(2, userId);
      ps.setString(3, TYPE_ATTENDANCE);
      ps.setString(4, date);
      ps.setString(5, period);
      ps.setString(6, message);
      ps.setLong(7, createdAt);
      ps.executeUpdate();
    }
  }

  public int resolveOpen(
      Connection conn, String userId, String date, String period, long resolvedAt)
      throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(RESOLVE_OPEN)) {
      ps.setLong(1, resolvedAt);
      ps.setString(2, userId);
      ps.setString(3, TYPE_ATTENDANCE);
      ps.setString(4, date);
      ps.setString(5, period);
      return ps.executeUpdate();
    }
  }
}
