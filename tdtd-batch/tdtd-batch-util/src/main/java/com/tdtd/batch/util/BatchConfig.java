package com.tdtd.batch.util;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.Optional;
import java.util.regex.Pattern;

/** Environment for tdtd-batch (mirrors tdtd-node `TDTD_DB_PATH` / `TDTD_TIMEZONE`). */
public final class BatchConfig {
  public static final String DEFAULT_TIMEZONE = "Asia/Manila";
  public static final String DEFAULT_CRON_AM = "0 0 7 * * ?";
  public static final String DEFAULT_CRON_PM = "0 30 12 * * ?";
  public static final String RUN_ONCE_ATTENDANCE_PDF = "ATTENDANCE_PDF";
  public static final String DEFAULT_PDF_OUTPUT_DIR = "data/reports";

  private static final Pattern DATE_RE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

  private final Path dbPath;
  private final String timeZone;
  private final String cronAm;
  private final String cronPm;
  private final Optional<String> runOnceMode;
  private final Optional<LocalDate> pdfDate;
  private final Optional<String> pdfPeriod;
  private final Path pdfOutputDir;

  public BatchConfig(
      Path dbPath,
      String timeZone,
      String cronAm,
      String cronPm,
      Optional<String> runOnceMode,
      Optional<LocalDate> pdfDate,
      Optional<String> pdfPeriod,
      Path pdfOutputDir) {
    this.dbPath = dbPath;
    this.timeZone = timeZone;
    this.cronAm = cronAm;
    this.cronPm = cronPm;
    this.runOnceMode = runOnceMode;
    this.pdfDate = pdfDate;
    this.pdfPeriod = pdfPeriod;
    this.pdfOutputDir = pdfOutputDir;
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

    Optional<String> runOnce =
        Optional.ofNullable(System.getenv("TDTD_BATCH_RUN_ONCE"))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(String::toUpperCase);

    Optional<LocalDate> pdfDate = parsePdfDateEnv(tz);
    Optional<String> pdfPeriod = parsePdfPeriodEnv();
    Path pdfOutputDir = resolvePdfOutputDir();

    return new BatchConfig(dbPath, tz, cronAm, cronPm, runOnce, pdfDate, pdfPeriod, pdfOutputDir);
  }

  private static Optional<LocalDate> parsePdfDateEnv(String timeZone) {
    String raw = System.getenv("TDTD_PDF_DATE");
    if (raw == null || raw.isBlank()) {
      return Optional.empty();
    }
    String d = raw.trim();
    if (!DATE_RE.matcher(d).matches()) {
      throw new IllegalArgumentException("TDTD_PDF_DATE must be YYYY-MM-DD, got: " + d);
    }
    return Optional.of(LocalDate.parse(d));
  }

  private static Optional<String> parsePdfPeriodEnv() {
    String raw = System.getenv("TDTD_PDF_PERIOD");
    if (raw == null || raw.isBlank()) {
      return Optional.empty();
    }
    String p = raw.trim().toUpperCase();
    if (!p.equals("AM") && !p.equals("PM")) {
      throw new IllegalArgumentException("TDTD_PDF_PERIOD must be AM or PM, got: " + raw);
    }
    return Optional.of(p);
  }

  private static Path resolvePdfOutputDir() {
    String raw = System.getenv("TDTD_PDF_OUTPUT_DIR");
    if (raw == null || raw.isBlank()) {
      return Paths.get(DEFAULT_PDF_OUTPUT_DIR).toAbsolutePath().normalize();
    }
    Path p = Paths.get(raw.trim());
    return p.isAbsolute() ? p.normalize() : Paths.get("").toAbsolutePath().resolve(p).normalize();
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

  /** Run-once task: `AM`, `PM`, or `ATTENDANCE_PDF`. */
  public Optional<String> getRunOnceMode() {
    return runOnceMode;
  }

  /** @deprecated use {@link #getRunOnceMode()} */
  @Deprecated
  public Optional<String> getRunOncePeriod() {
    return runOnceMode;
  }

  public Optional<LocalDate> getPdfDate() {
    return pdfDate;
  }

  public Optional<String> getPdfPeriod() {
    return pdfPeriod;
  }

  public Path getPdfOutputDir() {
    return pdfOutputDir;
  }

  public LocalDate resolvePdfDateOrToday() {
    return pdfDate.orElseGet(() -> TimeZones.todayIn(timeZone));
  }

  public boolean isRunOnceAttendancePdf() {
    return runOnceMode.map(RUN_ONCE_ATTENDANCE_PDF::equals).orElse(false);
  }
}
