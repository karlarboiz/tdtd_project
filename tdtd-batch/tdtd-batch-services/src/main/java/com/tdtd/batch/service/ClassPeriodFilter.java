package com.tdtd.batch.service;

import com.tdtd.batch.dao.model.ClassRow;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Mirrors frontend {@code listClassesForAttendancePeriod} in classShift.ts. */
public final class ClassPeriodFilter {
  private ClassPeriodFilter() {}

  public static List<ClassRow> forPeriod(List<ClassRow> classes, String period) {
    Map<String, ClassRow> byName = new LinkedHashMap<>();
    for (ClassRow c : classes) {
      ClassRow existing = byName.get(c.name());
      if (existing == null) {
        byName.put(c.name(), c);
        continue;
      }
      boolean cMatches = shiftMatchesPeriod(c.shift(), period);
      boolean existingMatches = shiftMatchesPeriod(existing.shift(), period);
      if (cMatches && !existingMatches) {
        byName.put(c.name(), c);
      }
    }
    List<ClassRow> out = new ArrayList<>(byName.values());
    out.sort(Comparator.comparing(ClassRow::name, String.CASE_INSENSITIVE_ORDER));
    return out;
  }

  static boolean shiftMatchesPeriod(String shift, String period) {
    return ("AM".equals(period) && "MRNG".equals(shift))
        || ("PM".equals(period) && "AFTNN".equals(shift));
  }
}
