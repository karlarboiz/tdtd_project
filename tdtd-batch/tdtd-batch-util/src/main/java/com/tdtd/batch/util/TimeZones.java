package com.tdtd.batch.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

public final class TimeZones {
  private TimeZones() {}

  public static LocalDate todayIn(String timeZoneId) {
    return ZonedDateTime.now(ZoneId.of(timeZoneId)).toLocalDate();
  }

  /** True when {@code ymd} is Saturday or Sunday (calendar weekday, not timezone-shifted). */
  public static boolean isWeekendYmd(LocalDate ymd) {
    DayOfWeek dow = ymd.getDayOfWeek();
    return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
  }
}
