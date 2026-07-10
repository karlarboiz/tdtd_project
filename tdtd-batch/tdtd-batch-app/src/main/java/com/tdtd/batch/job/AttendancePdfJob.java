package com.tdtd.batch.job;

import com.tdtd.batch.dao.DatabaseFactory;
import com.tdtd.batch.service.AttendancePdfService;
import com.tdtd.batch.service.SchoolDays;
import com.tdtd.batch.util.BatchConfig;
import java.nio.file.Path;
import java.sql.Connection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class AttendancePdfJob {
  private static final Logger LOG = LoggerFactory.getLogger(AttendancePdfJob.class);

  private AttendancePdfJob() {}

  public static void run(BatchConfig config) throws Exception {
    String period =
        config
            .getPdfPeriod()
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        "TDTD_PDF_PERIOD is required when TDTD_BATCH_RUN_ONCE=ATTENDANCE_PDF"));

    var date = config.resolvePdfDateOrToday();
    String userId = config.requireReportUserId();
    try (Connection conn = DatabaseFactory.open(config.getDbPath())) {
      if (!SchoolDays.isSchoolDay(conn, date)) {
        throw new IllegalArgumentException(
            "Attendance is not recorded on non-school days: " + date);
      }

      Path outputDir = config.getPdfOutputDir();
      AttendancePdfService service = new AttendancePdfService();

      Path written =
          service.generate(conn, userId, date, period, outputDir, config.getTimeZone());
      LOG.info(
          "Attendance PDF written for {} {} → {}",
          date,
          period,
          written);
    }
  }
}
