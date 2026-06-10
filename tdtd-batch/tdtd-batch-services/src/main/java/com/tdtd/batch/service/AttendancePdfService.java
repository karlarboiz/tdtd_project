package com.tdtd.batch.service;

import com.tdtd.batch.dao.AttendanceReportDao;
import com.tdtd.batch.dao.model.ClassRow;
import com.tdtd.batch.dao.model.StudentRow;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class AttendancePdfService {
  private static final Logger LOG = LoggerFactory.getLogger(AttendancePdfService.class);

  private static final float MARGIN = 50f;
  private static final float LINE_HEIGHT = 16f;
  private static final float TITLE_SIZE = 18f;
  private static final float HEADING_SIZE = 13f;
  private static final float BODY_SIZE = 11f;
  private static final float FOOTER_SIZE = 9f;

  private static final PDType1Font FONT_BOLD =
      new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
  private static final PDType1Font FONT_REGULAR =
      new PDType1Font(Standard14Fonts.FontName.HELVETICA);

  private static final DateTimeFormatter LONG_DATE =
      DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH);
  private static final DateTimeFormatter FOOTER_TS =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z", Locale.ENGLISH);

  private final AttendanceReportDao reportDao = new AttendanceReportDao();

  public Path generate(
      Connection conn,
      LocalDate date,
      String period,
      Path outputDir,
      String timeZoneId)
      throws SQLException, IOException {
    Files.createDirectories(outputDir);

    String dateYmd = date.toString();
    Optional<String> sessionId = reportDao.findSessionId(conn, dateYmd, period);
    if (sessionId.isEmpty()) {
      LOG.warn("No attendance session saved for {} {}", dateYmd, period);
    }

    Set<String> presentIds =
        sessionId.isPresent()
            ? reportDao.listPresentStudentIds(conn, sessionId.get())
            : Set.of();
    List<ClassRow> classes =
        ClassPeriodFilter.forPeriod(reportDao.listAllClasses(conn), period);

    String fileName = "attendance-" + dateYmd + "-" + period + ".pdf";
    Path finalPath = outputDir.resolve(fileName);
    Path tempPath = outputDir.resolve(fileName + ".tmp");

    try (PDDocument doc = new PDDocument()) {
      PdfWriter writer = new PdfWriter(doc, date, period, timeZoneId, sessionId.isEmpty());
      writer.writeHeader();

      int sessionPresent = 0;
      int sessionTotal = 0;

      for (ClassRow clazz : classes) {
        List<StudentRow> roster = reportDao.listStudentsByClass(conn, clazz.id());
        if (roster.isEmpty()) {
          continue;
        }
        int classPresent = 0;
        writer.writeClassHeading(clazz.name());
        writer.writeTableHeader();
        int rowNum = 1;
        for (StudentRow student : roster) {
          boolean present = presentIds.contains(student.id());
          if (present) {
            classPresent++;
          }
          writer.writeStudentRow(rowNum++, student.displayName(), present);
        }
        writer.writeClassSummary(classPresent, roster.size());
        sessionPresent += classPresent;
        sessionTotal += roster.size();
      }

      if (classes.isEmpty() || sessionTotal == 0) {
        writer.writeNote("No students registered for this period.");
      } else {
        writer.writeSessionSummary(sessionPresent, sessionTotal);
      }

      writer.writeFooter();
      writer.finish();
      doc.save(tempPath.toFile());
    }

    try {
      Files.move(
          tempPath,
          finalPath,
          StandardCopyOption.REPLACE_EXISTING,
          StandardCopyOption.ATOMIC_MOVE);
    } catch (IOException e) {
      Files.move(tempPath, finalPath, StandardCopyOption.REPLACE_EXISTING);
    }
    return finalPath.toAbsolutePath().normalize();
  }

  private final class PdfWriter {
    private final PDDocument doc;
    private final LocalDate date;
    private final String period;
    private final String timeZoneId;
    private final boolean noSession;

    private PDPage page;
    private PDPageContentStream stream;
    private float y;

    PdfWriter(PDDocument doc, LocalDate date, String period, String timeZoneId, boolean noSession) {
      this.doc = doc;
      this.date = date;
      this.period = period;
      this.timeZoneId = timeZoneId;
      this.noSession = noSession;
      newPage();
    }

    void writeHeader() throws IOException {
      text(FONT_BOLD, TITLE_SIZE, "Attendance Report");
      y -= LINE_HEIGHT;
      text(
          FONT_REGULAR,
          BODY_SIZE,
          date.format(LONG_DATE) + "  ·  " + period + " session");
      y -= LINE_HEIGHT;
      if (noSession) {
        text(FONT_REGULAR, BODY_SIZE, "No attendance session saved");
        y -= LINE_HEIGHT;
      }
      y -= 8f;
    }

    void writeClassHeading(String className) throws IOException {
      ensureSpace(LINE_HEIGHT * 2);
      y -= 8f;
      text(FONT_BOLD, HEADING_SIZE, className);
      y -= 4f;
    }

    void writeTableHeader() throws IOException {
      ensureSpace(LINE_HEIGHT * 2);
      float colNum = MARGIN;
      float colName = MARGIN + 28f;
      float colPresent = pageWidth() - MARGIN - 60f;
      textAt(FONT_BOLD, BODY_SIZE, colNum, y, "#");
      textAt(FONT_BOLD, BODY_SIZE, colName, y, "Name");
      textAt(FONT_BOLD, BODY_SIZE, colPresent, y, "Present");
      y -= LINE_HEIGHT;
    }

    void writeStudentRow(int num, String name, boolean present) throws IOException {
      ensureSpace(LINE_HEIGHT);
      float colNum = MARGIN;
      float colName = MARGIN + 28f;
      float colPresent = pageWidth() - MARGIN - 60f;
      textAt(FONT_REGULAR, BODY_SIZE, colNum, y, String.valueOf(num));
      textAt(FONT_REGULAR, BODY_SIZE, colName, y, name);
      textAt(FONT_REGULAR, BODY_SIZE, colPresent, y, present ? "Present" : "-");
      y -= LINE_HEIGHT;
    }

    void writeClassSummary(int present, int total) throws IOException {
      ensureSpace(LINE_HEIGHT * 2);
      y -= 4f;
      text(FONT_REGULAR, BODY_SIZE, present + " / " + total + " present");
      y -= LINE_HEIGHT;
    }

    void writeSessionSummary(int present, int total) throws IOException {
      ensureSpace(LINE_HEIGHT * 2);
      y -= 8f;
      text(FONT_BOLD, BODY_SIZE, "Session total: " + present + " / " + total + " present");
      y -= LINE_HEIGHT;
    }

    void writeNote(String note) throws IOException {
      ensureSpace(LINE_HEIGHT * 2);
      text(FONT_REGULAR, BODY_SIZE, note);
      y -= LINE_HEIGHT;
    }

    void writeFooter() throws IOException {
      ensureSpace(LINE_HEIGHT * 3);
      y -= 16f;
      ZonedDateTime now = ZonedDateTime.now(ZoneId.of(timeZoneId));
      text(FONT_REGULAR, FOOTER_SIZE, "Generated " + now.format(FOOTER_TS));
    }

    void finish() throws IOException {
      closeStream();
    }

    private void text(PDType1Font font, float size, String text) throws IOException {
      textAt(font, size, MARGIN, y, text);
    }

    private void textAt(PDType1Font font, float size, float x, float baselineY, String text)
        throws IOException {
      stream.beginText();
      stream.setFont(font, size);
      stream.newLineAtOffset(x, baselineY);
      stream.showText(sanitize(text));
      stream.endText();
    }

    private void ensureSpace(float needed) throws IOException {
      if (y - needed < MARGIN + 20f) {
        closeStream();
        newPage();
      }
    }

    private void newPage() {
      page = new PDPage(PDRectangle.LETTER);
      doc.addPage(page);
      try {
        stream = new PDPageContentStream(doc, page);
        y = page.getMediaBox().getHeight() - MARGIN;
      } catch (IOException e) {
        throw new RuntimeException(e);
      }
    }

    private void closeStream() throws IOException {
      if (stream != null) {
        stream.close();
        stream = null;
      }
    }

    private float pageWidth() {
      return page.getMediaBox().getWidth();
    }

    /** PDF Type1 fonts only support WinAnsiEncoding — strip unsupported chars. */
    private String sanitize(String raw) {
      if (raw == null || raw.isEmpty()) {
        return "";
      }
      StringBuilder sb = new StringBuilder(raw.length());
      for (int i = 0; i < raw.length(); i++) {
        char c = raw.charAt(i);
        if (c >= 32 && c <= 126) {
          sb.append(c);
        } else if (c == '\u2013' || c == '\u2014') {
          sb.append('-');
        } else {
          sb.append('?');
        }
      }
      return sb.toString();
    }
  }
}
