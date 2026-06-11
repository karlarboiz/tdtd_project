package com.tdtd.batch.service;

import com.tdtd.batch.dao.GovernmentHolidayDao;
import com.tdtd.batch.util.TimeZones;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;

public final class SchoolDays {
  private static final GovernmentHolidayDao HOLIDAY_DAO = new GovernmentHolidayDao();

  private SchoolDays() {}

  /** Weekday that is not a cached non-working government holiday. */
  public static boolean isSchoolDay(Connection conn, LocalDate ymd) throws SQLException {
    if (TimeZones.isWeekendYmd(ymd)) {
      return false;
    }
    return !HOLIDAY_DAO.isNonWorkingHoliday(conn, ymd.toString());
  }
}
