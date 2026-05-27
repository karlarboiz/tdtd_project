package com.tdtd.batch.util;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

/** Environment for tdtd-batch (mirrors tdtd-node `TDTD_DB_PATH` / `TDTD_TIMEZONE`). */
public final class BatchConfig {
  public static final String DEFAULT_TIMEZONE = "Asia/Manila";
  public static final String DEFAULT_CRON_AM = "0 0 7 * * ?";
  public static final String DEFAULT_CRON_PM = "0 30 12 * * ?";

  private final Path dbPath;
  private final String timeZone;
  private final String cronAm;
  private final String cronPm;
  private final Optional<String> runOncePeriod;

  public BatchConfig(
      Path dbPath,
      String timeZone,
      String cronAm,
      String cronPm,
      Optional<String> runOncePeriod) {
    this.dbPath = dbPath;
    this.timeZone = timeZone;
    this.cronAm = cronAm;
    this.cronPm = cronPm;
    this.runOncePeriod = runOncePeriod;
  }

  public static BatchConfig fromEnvironment() {
    String dbRaw = System.getenv("TDTD_DB_PATH");
    Path dbPath;
    if (dbRaw == null || dbRaw.isBlank()) {
      dbPath = Paths.get("data", "teacher_app.sqlite").toAbsolutePath().normalize();
    } else {
      Path p = Paths.get(dbRaw.trim());
      dbPath = p.isAbsolute() ? p.normalize() : Paths.get("").toAbsolutePath().resolve(p).normalize();
    }

    String tz = envOrDefault("TDTD_TIMEZONE", DEFAULT_TIMEZONE);
    String cronAm = envOrDefault("TDTD_CRON_AM", DEFAULT_CRON_AM);
    String cronPm = envOrDefault("TDTD_CRON_PM", DEFAULT_CRON_PM);

    Optional<String> runOnce = Optional.ofNullable(System.getenv("TDTD_BATCH_RUN_ONCE"))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .map(String::toUpperCase);

    return new BatchConfig(dbPath, tz, cronAm, cronPm, runOnce);
  }

  private static String envOrDefault(String key, String fallback) {
    String v = System.getenv(key);
    if (v == null || v.isBlank()) return fallback;
    return v.trim();
  }

  public Path getDbPath() {
    return dbPath;
  }

  public String getTimeZone() {
    return timeZone;
  }

  public String getCronAm() {
    return cronAm;
  }

  public String getCronPm() {
    return cronPm;
  }

  public Optional<String> getRunOncePeriod() {
    return runOncePeriod;
  }
}
