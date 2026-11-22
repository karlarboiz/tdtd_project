package com.tdtd.batch.deped;

import jakarta.batch.api.AbstractBatchlet;
import jakarta.batch.api.BatchProperty;
import jakarta.batch.runtime.context.StepContext;
import jakarta.inject.Inject;

import java.io.BufferedWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Writes the deped-report CSV from roster, attendance counts, and score history.
 * Not an official DepEd SF9 or SF10 form.
 */
public class DepedReportBatchlet extends AbstractBatchlet {
    private static final String HEADER = "className,shift,studentId,lastName,firstName,middleName,"
            + "attendancePresent,attendanceAbsent,attendanceLate,"
            + "subjectName,scoreKind,scoreTitle,scoreDate,score,maxScore";

    @Inject
    @BatchProperty(name = "output")
    private String output;

    @Inject
    @BatchProperty(name = "classId")
    private String classId;

    @Inject
    @BatchProperty(name = "from")
    private String from;

    @Inject
    @BatchProperty(name = "to")
    private String to;

    @Inject
    private StepContext stepContext;

    @Override
    public String process() throws Exception {
        String outputPath = requireOutput(output);
        LocalDate fromDate = null;
        LocalDate toDate = null;
        boolean hasFrom = !isBlank(from);
        boolean hasTo = !isBlank(to);
        if (hasFrom != hasTo) {
            throw new IllegalArgumentException("Set both from and to (YYYY-MM-DD), or leave both blank");
        }
        if (hasFrom) {
            fromDate = parseDate("from", from);
            toDate = parseDate("to", to);
            if (fromDate.isAfter(toDate)) {
                throw new IllegalArgumentException("from is after to");
            }
        }

        List<DepedReportRow> rows = DepedReportDao.load(blankToNull(classId), fromDate, toDate);
        Path path = Path.of(outputPath);
        Path parent = path.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        write(path, rows);
        return "rows=" + rows.size();
    }

    @Override
    public void stop() {
        if (stepContext != null) {
            stepContext.setExitStatus("STOPPED");
        }
    }

    private static void write(Path path, List<DepedReportRow> rows) throws IOException {
        try (BufferedWriter writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            writer.write(HEADER);
            writer.write('\n');
            for (DepedReportRow row : rows) {
                writer.write(line(row));
                writer.write('\n');
            }
        }
    }

    private static String line(DepedReportRow row) {
        return String.join(",",
                csv(row.className()),
                csv(row.shift()),
                csv(row.studentId()),
                csv(row.lastName()),
                csv(row.firstName()),
                csv(row.middleName()),
                Integer.toString(row.attendancePresent()),
                Integer.toString(row.attendanceAbsent()),
                Integer.toString(row.attendanceLate()),
                csv(row.subjectName()),
                csv(row.scoreKind()),
                csv(row.scoreTitle()),
                csv(row.scoreDate()),
                csv(formatNumber(row.score())),
                csv(formatNumber(row.maxScore())));
    }

    private static String csv(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        boolean quote = value.indexOf(',') >= 0
                || value.indexOf('"') >= 0
                || value.indexOf('\n') >= 0
                || value.indexOf('\r') >= 0;
        if (!quote) {
            return value;
        }
        return '"' + value.replace("\"", "\"\"") + '"';
    }

    private static String formatNumber(Double value) {
        if (value == null) {
            return "";
        }
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }

    private static String requireOutput(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("output is required");
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static LocalDate parseDate(String label, String raw) {
        try {
            return LocalDate.parse(raw.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(label + " must be YYYY-MM-DD", exception);
        }
    }
}
