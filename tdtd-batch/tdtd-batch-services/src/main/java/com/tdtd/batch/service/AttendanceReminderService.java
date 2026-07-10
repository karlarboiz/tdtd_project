package com.tdtd.batch.service;

import com.tdtd.batch.dao.AttendanceDao;
import com.tdtd.batch.dao.TeacherReminderDao;
import com.tdtd.batch.dao.UserDao;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Mirrors tdtd-node `syncAttendanceDueReminder` per active user. */
public final class AttendanceReminderService {
  private static final Logger LOG = LoggerFactory.getLogger(AttendanceReminderService.class);

  private final UserDao userDao = new UserDao();
  private final AttendanceDao attendanceDao = new AttendanceDao();
  private final TeacherReminderDao reminderDao = new TeacherReminderDao();

  public String syncAll(Connection conn, String dateYmd, String period, String timeZoneId)
      throws SQLException {
    List<String> userIds = userDao.listActiveUserIds(conn);
    if (userIds.isEmpty()) {
      LOG.info("No active users — skipping attendance reminders for {} {}", dateYmd, period);
      return "skipped";
    }

    int opened = 0;
    int resolved = 0;
    int unchanged = 0;

    for (String userId : userIds) {
      String result = syncForUser(conn, userId, dateYmd, period, timeZoneId);
      switch (result) {
        case "opened" -> opened++;
        case "resolved" -> resolved++;
        default -> unchanged++;
      }
    }

    LOG.info(
        "AttendanceReminder sync {} {} → opened={}, resolved={}, unchanged={}",
        dateYmd,
        period,
        opened,
        resolved,
        unchanged);
    return opened > 0 ? "opened" : resolved > 0 ? "resolved" : "unchanged";
  }

  public String syncForUser(
      Connection conn, String userId, String dateYmd, String period, String timeZoneId)
      throws SQLException {
    LocalDate date = LocalDate.parse(dateYmd);
    if (!SchoolDays.isSchoolDay(conn, date)) {
      LOG.debug(
          "Skipping attendance reminder for non-school day {} {} user={}",
          dateYmd,
          period,
          userId);
      return "skipped";
    }

    if (attendanceDao.sessionExists(conn, userId, dateYmd, period)) {
      int n = reminderDao.resolveOpen(conn, userId, dateYmd, period, System.currentTimeMillis());
      if (n > 0) {
        LOG.info(
            "Resolved {} open attendance reminder(s) for user={} {} {}",
            n,
            userId,
            dateYmd,
            period);
        return "resolved";
      }
      return "unchanged";
    }

    if (reminderDao.hasOpen(conn, userId, dateYmd, period)) {
      return "unchanged";
    }

    String message =
        "AM".equals(period)
            ? "Take AM attendance for today."
            : "Take PM attendance for today.";

    try {
      reminderDao.insertOpen(
          conn, userId, dateYmd, period, message, System.currentTimeMillis());
      LOG.info("Opened attendance reminder for user={} {} {}", userId, dateYmd, period);
      return "opened";
    } catch (SQLException e) {
      if (isUniqueViolation(e) && reminderDao.hasOpen(conn, userId, dateYmd, period)) {
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
