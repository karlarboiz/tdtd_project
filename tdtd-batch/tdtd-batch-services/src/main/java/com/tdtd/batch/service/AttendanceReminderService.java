package com.tdtd.batch.service;

import com.tdtd.batch.dao.AttendanceDao;
import com.tdtd.batch.dao.TeacherReminderDao;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Mirrors tdtd-node `syncAttendanceDueReminder`. */
public final class AttendanceReminderService {
  private static final Logger LOG = LoggerFactory.getLogger(AttendanceReminderService.class);

  private final AttendanceDao attendanceDao = new AttendanceDao();
  private final TeacherReminderDao reminderDao = new TeacherReminderDao();

  public String sync(Connection conn, String dateYmd, String period, String timeZoneId)
      throws SQLException {
    LocalDate date = LocalDate.parse(dateYmd);
    if (!SchoolDays.isSchoolDay(conn, date)) {
      LOG.info(
          "Skipping attendance reminder for non-school day {} {} ({})",
          dateYmd,
          period,
          timeZoneId);
      return "skipped";
    }

    if (attendanceDao.sessionExists(conn, dateYmd, period)) {
      int n = reminderDao.resolveOpen(conn, dateYmd, period, System.currentTimeMillis());
      if (n > 0) {
        LOG.info("Resolved {} open attendance reminder(s) for {} {} ({})", n, dateYmd, period, timeZoneId);
        return "resolved";
      }
      return "unchanged";
    }

    if (reminderDao.hasOpen(conn, dateYmd, period)) {
      return "unchanged";
    }

    String message =
        "AM".equals(period)
            ? "Take AM attendance for today."
            : "Take PM attendance for today.";

    try {
      reminderDao.insertOpen(conn, dateYmd, period, message, System.currentTimeMillis());
      LOG.info("Opened attendance reminder for {} {} ({})", dateYmd, period, timeZoneId);
      return "opened";
    } catch (SQLException e) {
      if (isUniqueViolation(e) && reminderDao.hasOpen(conn, dateYmd, period)) {
        return "unchanged";
      }
      throw e;
    }
  }

  private static boolean isUniqueViolation(SQLException e) {
    String msg = e.getMessage();
    return msg != null && msg.toLowerCase().contains("unique");
  }
}
