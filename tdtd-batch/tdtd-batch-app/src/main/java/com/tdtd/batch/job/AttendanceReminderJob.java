package com.tdtd.batch.job;

import com.tdtd.batch.dao.DatabaseFactory;
import com.tdtd.batch.service.AttendanceReminderService;
import com.tdtd.batch.util.BatchConfig;
import com.tdtd.batch.util.TimeZones;
import java.sql.Connection;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AttendanceReminderJob implements Job {
  public static final String KEY_PERIOD = "period";

  private static final Logger LOG = LoggerFactory.getLogger(AttendanceReminderJob.class);

  @Override
  public void execute(JobExecutionContext context) throws JobExecutionException {
    JobDataMap map = context.getMergedJobDataMap();
    String period = map.getString(KEY_PERIOD);
    if (period == null || period.isBlank()) {
      throw new JobExecutionException("JobDataMap missing period (AM|PM)");
    }
    period = period.trim().toUpperCase();
    if (!period.equals("AM") && !period.equals("PM")) {
      throw new JobExecutionException("Invalid period: " + period);
    }

    BatchConfig config = BatchConfig.fromEnvironment();
    String dateYmd = TimeZones.todayIn(config.getTimeZone()).toString();
    AttendanceReminderService service = new AttendanceReminderService();

    try (Connection conn = DatabaseFactory.open(config.getDbPath())) {
      String result = service.sync(conn, dateYmd, period, config.getTimeZone());
      LOG.info("AttendanceReminderJob {} {} → {}", dateYmd, period, result);
    } catch (Exception e) {
      throw new JobExecutionException(e);
    }
  }
}
