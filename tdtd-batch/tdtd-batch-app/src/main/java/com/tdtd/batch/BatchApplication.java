package com.tdtd.batch;

import com.tdtd.batch.dao.DatabaseFactory;
import com.tdtd.batch.job.AttendancePdfJob;
import com.tdtd.batch.job.DepEdReportJob;
import com.tdtd.batch.service.AttendanceReminderService;
import com.tdtd.batch.util.BatchConfig;
import com.tdtd.batch.util.TimeZones;
import java.sql.Connection;
import java.util.TimeZone;
import org.quartz.CronScheduleBuilder;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.quartz.impl.StdSchedulerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class BatchApplication {
  private static final Logger LOG = LoggerFactory.getLogger(BatchApplication.class);

  private BatchApplication() {}

  public static void main(String[] args) throws Exception {
    BatchConfig config;
    try {
      config = BatchConfig.fromEnvironment();
    } catch (IllegalArgumentException e) {
      LOG.error("Invalid configuration: {}", e.getMessage());
      System.exit(2);
      return;
    }

    LOG.info("tdtd-batch starting — db={}, timezone={}", config.getDbPath(), config.getTimeZone());

    if (config.getRunOnceMode().isPresent()) {
      runOnce(config, config.getRunOnceMode().get());
      return;
    }

    Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();
    TimeZone tz = TimeZone.getTimeZone(config.getTimeZone());

    JobDetail amJob =
        JobBuilder.newJob(AttendanceReminderJob.class)
            .withIdentity("attendance-reminder-am", "tdtd")
            .usingJobData(AttendanceReminderJob.KEY_PERIOD, "AM")
            .build();

    JobDetail pmJob =
        JobBuilder.newJob(AttendanceReminderJob.class)
            .withIdentity("attendance-reminder-pm", "tdtd")
            .usingJobData(AttendanceReminderJob.KEY_PERIOD, "PM")
            .build();

    Trigger amTrigger =
        TriggerBuilder.newTrigger()
            .withIdentity("attendance-reminder-am-trigger", "tdtd")
            .forJob(amJob)
            .withSchedule(
                CronScheduleBuilder.cronSchedule(config.getCronAm()).inTimeZone(tz))
            .build();

    Trigger pmTrigger =
        TriggerBuilder.newTrigger()
            .withIdentity("attendance-reminder-pm-trigger", "tdtd")
            .forJob(pmJob)
            .withSchedule(
                CronScheduleBuilder.cronSchedule(config.getCronPm()).inTimeZone(tz))
            .build();

    scheduler.scheduleJob(amJob, amTrigger);
    scheduler.scheduleJob(pmJob, pmTrigger);
    scheduler.start();

    LOG.info("Scheduled AM cron={} PM cron={} in {}", config.getCronAm(), config.getCronPm(), tz.getID());
    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
      try {
        scheduler.shutdown(true);
      } catch (SchedulerException e) {
        LOG.warn("Scheduler shutdown failed", e);
      }
    }));

    Thread.currentThread().join();
  }

  private static void runOnce(BatchConfig config, String mode) throws Exception {
    String m = mode.toUpperCase();
    if (BatchConfig.RUN_ONCE_ATTENDANCE_PDF.equals(m)) {
      try {
        AttendancePdfJob.run(config);
      } catch (IllegalArgumentException e) {
        LOG.error("Attendance PDF failed: {}", e.getMessage());
        System.exit(2);
        return;
      } catch (Exception e) {
        LOG.error("Attendance PDF failed", e);
        System.exit(1);
        return;
      }
      System.exit(0);
      return;
    }

    if (m.endsWith("_PDF") && (m.startsWith("SF") || m.equals("DEPED_PDF"))) {
      try {
        DepEdReportJob.run(config);
      } catch (IllegalArgumentException e) {
        LOG.error("DepEd PDF failed: {}", e.getMessage());
        System.exit(2);
        return;
      } catch (Exception e) {
        LOG.error("DepEd PDF failed", e);
        System.exit(1);
        return;
      }
      System.exit(0);
      return;
    }

    if (!m.equals("AM") && !m.equals("PM")) {
      LOG.error("TDTD_BATCH_RUN_ONCE must be AM, PM, or ATTENDANCE_PDF, got: {}", mode);
      System.exit(2);
      return;
    }

    String dateYmd = TimeZones.todayIn(config.getTimeZone()).toString();
    AttendanceReminderService service = new AttendanceReminderService();
    try (Connection conn = DatabaseFactory.open(config.getDbPath())) {
      String result = service.sync(conn, dateYmd, m, config.getTimeZone());
      LOG.info("Run-once {} {} → {}", dateYmd, m, result);
    }
    System.exit(0);
  }
}
