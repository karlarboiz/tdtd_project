package com.tdtd.batch;

import com.tdtd.batch.dao.DatabaseFactory;
import com.tdtd.batch.job.AttendanceReminderJob;
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
    BatchConfig config = BatchConfig.fromEnvironment();
    LOG.info("tdtd-batch starting — db={}, timezone={}", config.getDbPath(), config.getTimeZone());

    if (config.getRunOncePeriod().isPresent()) {
      runOnce(config, config.getRunOncePeriod().get());
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

  private static void runOnce(BatchConfig config, String period) throws Exception {
    String p = period.toUpperCase();
    if (!p.equals("AM") && !p.equals("PM")) {
      LOG.error("TDTD_BATCH_RUN_ONCE must be AM or PM, got: {}", period);
      System.exit(2);
      return;
    }
    String dateYmd = TimeZones.todayIn(config.getTimeZone()).toString();
    AttendanceReminderService service = new AttendanceReminderService();
    try (Connection conn = DatabaseFactory.open(config.getDbPath())) {
      String result = service.sync(conn, dateYmd, p, config.getTimeZone());
      LOG.info("Run-once {} {} → {}", dateYmd, p, result);
    }
    System.exit(0);
  }
}
