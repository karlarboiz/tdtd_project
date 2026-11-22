package com.tdtd.batch.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/** Reads cached PH holidays synced by tdtd-node from Official Gazette proclamations. */
public final class GovernmentHolidayDao {
  private static final String IS_NON_WORKING =
      """
      SELECT 1 AS ok FROM government_holidays
      WHERE date = ?
        AND type IN ('REGULAR', 'SPECIAL_NON_WORKING')
      LIMIT 1
      """;

  /**
   * True when {@code dateYmd} is a regular or special non-working holiday.
   * Fail-open when the table is missing or empty (weekends-only behavior).
   */
  public boolean isNonWorkingHoliday(Connection conn, String dateYmd) throws SQLException {
    try (PreparedStatement ps = conn.prepareStatement(IS_NON_WORKING)) {
      ps.setString(1, dateYmd);
      try (ResultSet rs = ps.executeQuery()) {
        return rs.next();
      }
    } catch (SQLException e) {
      if (isMissingTable(e)) {
        return false;
      }
      throw e;
    }
  }

  private static boolean isMissingTable(SQLException e) {
    String msg = e.getMessage();
    return msg != null && msg.toLowerCase().contains("no such table: government_holidays");
  }
}
