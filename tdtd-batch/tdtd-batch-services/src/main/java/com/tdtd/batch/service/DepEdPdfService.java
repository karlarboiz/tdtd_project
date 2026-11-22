package com.tdtd.batch.service;

import com.tdtd.batch.dao.DepEdReportDao;
import com.tdtd.batch.dao.model.ClassRow;
import com.tdtd.batch.dao.model.StudentRow;
import com.tdtd.batch.util.BatchConfig;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Generates DepEd official form PDFs (SF1, SF2, SF4, SF5, SF9, SF10). */
public final class DepEdPdfService {
  private static final Logger LOG = LoggerFactory.getLogger(DepEdPdfService.class);

  private static final PDType1Font FONT_BOLD =
      new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
  private static final PDType1Font FONT_REGULAR =
      new PDType1Font(Standard14Fonts.FontName.HELVETICA);

  private final DepEdReportDao reportDao = new DepEdReportDao();

  public Path generate(
      Connection conn,
      String userId,
      String form,
      String classId,
      String studentId,
      String month,
      Path outputDir,
      String timeZoneId)
      throws SQLException, IOException {
    Files.createDirectories(outputDir);

    String formUpper = form.toUpperCase();
    String baseName =
        form.toLowerCase()
            + "-"
            + (classId != null && !classId.isBlank() ? classId : studentId);
    Path finalPath = outputDir.resolve(baseName + ".pdf");
    Path tempPath = outputDir.resolve(baseName + ".pdf.tmp");

    String schoolName = reportDao.getSchoolName(conn, userId);
    ClassRow classRow =
        classId != null && !classId.isBlank()
            ? reportDao.getClass(conn, userId, classId)
            : null;
    if (classId != null && !classId.isBlank() && classRow == null) {
      throw new IllegalArgumentException("class not found for user: " + classId);
    }
    List<StudentRow> students =
        classId != null && !classId.isBlank()
            ? reportDao.listStudentsByClass(conn, userId, classId)
            : List.of();

    try (PDDocument doc = new PDDocument()) {
      PDPage page = new PDPage(PDRectangle.LETTER);
      doc.addPage(page);

      try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
        float y = 750;
        cs.beginText();
        cs.setFont(FONT_BOLD, 16);
        cs.newLineAtOffset(50, y);
        cs.showText("DepEd Form " + formUpper + " — " + schoolName);
        cs.endText();

        y -= 30;
        if (classRow != null) {
          writeLine(cs, 50, y, "Class: " + classRow.name() + " (" + classRow.shift() + ")");
          y -= 16;
        }
        if (month != null && !month.isBlank()) {
          writeLine(cs, 50, y, "Month: " + month);
          y -= 16;
        }

        y -= 10;
        writeLine(cs, 50, y, "# | Name");
        y -= 14;
        int n = 1;
        for (StudentRow s : students) {
          if (y < 80) break;
          writeLine(cs, 50, y, n + " | " + s.displayName());
          y -= 14;
          n++;
        }

        String footer =
            "Generated "
                + ZonedDateTime.now(java.time.ZoneId.of(timeZoneId))
                    .format(
                        DateTimeFormatter.ofPattern(
                            "yyyy-MM-dd HH:mm:ss z", Locale.ENGLISH));
        writeLine(cs, 50, 40, footer);
      }

      doc.save(tempPath.toFile());
    }

    Files.move(tempPath, finalPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    LOG.info("Wrote DepEd PDF: {}", finalPath);
    return finalPath;
  }

  private static void writeLine(PDPageContentStream cs, float x, float y, String text)
      throws IOException {
    cs.beginText();
    cs.setFont(FONT_REGULAR, 11);
    cs.newLineAtOffset(x, y);
    cs.showText(text.length() > 90 ? text.substring(0, 90) : text);
    cs.endText();
  }

  public static void runFromEnvironment(BatchConfig config) throws Exception {
    String userId = config.requireReportUserId();
    String form = envOrThrow("TDTD_BATCH_RUN_ONCE");
    String classId = envOrDefault("TDTD_REPORT_CLASS_ID", "");
    String studentId = envOrDefault("TDTD_REPORT_STUDENT_ID", "");
    String month = envOrDefault("TDTD_REPORT_MONTH", "");
    Path outputDir = config.getPdfOutputDir();

    try (Connection conn =
        com.tdtd.batch.dao.DatabaseFactory.open(config.getDbPath())) {
      new DepEdPdfService()
          .generate(
              conn,
              userId,
              form.replace("_PDF", ""),
              classId,
              studentId,
              month,
              outputDir,
              config.getTimeZone());
    }
  }

  private static String envOrThrow(String key) {
    String v = System.getenv(key);
    if (v == null || v.isBlank()) {
      throw new IllegalArgumentException(key + " is required");
    }
    return v.trim().toUpperCase();
  }

  private static String envOrDefault(String key, String fallback) {
    String v = System.getenv(key);
    if (v == null) return fallback;
    return v.trim();
  }
}
