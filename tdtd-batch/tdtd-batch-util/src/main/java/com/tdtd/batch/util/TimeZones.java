package com.tdtd.batch.util;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

public final class TimeZones {
  private TimeZones() {}

  public static LocalDate todayIn(String timeZoneId) {
    return ZonedDateTime.now(ZoneId.of(timeZoneId)).toLocalDate();
  }
}
