package com.tdtd.batch.students;

import jakarta.batch.api.BatchProperty;
import jakarta.batch.api.chunk.AbstractItemReader;
import jakarta.inject.Inject;

import java.io.IOException;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Reads the first sheet of an .xlsx workbook. Row 1 is the header.
 * The checkpoint is the 0-based index of the next sheet row to read.
 */
public class StudentImportReader extends AbstractItemReader {
    private static final int FIRST_DATA_ROW = 1;

    private static final Map<String, String> HEADER_MAP = Map.ofEntries(
            Map.entry("firstname", "firstName"),
            Map.entry("fname", "firstName"),
            Map.entry("first", "firstName"),
            Map.entry("middlename", "middleName"),
            Map.entry("middle", "middleName"),
            Map.entry("mi", "middleName"),
            Map.entry("lastname", "lastName"),
            Map.entry("lname", "lastName"),
            Map.entry("last", "lastName"),
            Map.entry("surname", "lastName"),
            Map.entry("birthdate", "birthDate"),
            Map.entry("dateofbirth", "birthDate"),
            Map.entry("dob", "birthDate"),
            Map.entry("gender", "gender"),
            Map.entry("sex", "gender")
    );

    private static final List<String> REQUIRED_HEADERS = List.of(
            "firstName", "lastName", "birthDate", "gender");

    @Inject
    @BatchProperty(name = "file")
    private String file;

    @Inject
    @BatchProperty(name = "classId")
    private String classId;

    private XSSFWorkbook workbook;
    private Sheet sheet;
    private boolean date1904;
    private final Map<String, Integer> columns = new HashMap<>();
    private int nextRowIndex = FIRST_DATA_ROW;

    @Override
    public void open(Serializable checkpoint) throws Exception {
        close();
        String workbookPath = requiredParameter(file, "file");
        requiredParameter(classId, "classId");
        Path path = Path.of(workbookPath);
        if (!Files.isRegularFile(path)) {
            throw new IllegalStateException("Student workbook not found: " + path.toAbsolutePath());
        }

        XSSFWorkbook opened = new XSSFWorkbook(path.toFile());
        try {
            if (opened.getNumberOfSheets() < 1) {
                throw new IllegalStateException("The workbook has no sheets.");
            }
            workbook = opened;
            date1904 = opened.isDate1904();
            sheet = opened.getSheetAt(0);
            mapHeaders(sheet.getRow(0));
            nextRowIndex = startRow(checkpoint);
        } catch (RuntimeException exception) {
            workbook = null;
            sheet = null;
            try {
                opened.close();
            } catch (IOException closeError) {
                exception.addSuppressed(closeError);
            }
            throw exception;
        }
    }

    @Override
    public void close() throws Exception {
        XSSFWorkbook openBook = workbook;
        workbook = null;
        sheet = null;
        if (openBook != null) {
            openBook.close();
        }
    }

    @Override
    public Object readItem() {
        if (sheet == null) {
            return null;
        }
        int lastRow = sheet.getLastRowNum();
        while (nextRowIndex <= lastRow) {
            int rowIndex = nextRowIndex;
            nextRowIndex++;
            StudentImportRow row = readDataRow(rowIndex);
            if (row != null) {
                return row;
            }
        }
        return null;
    }

    @Override
    public Serializable checkpointInfo() {
        return nextRowIndex;
    }

    private void mapHeaders(Row header) {
        columns.clear();
        if (header != null) {
            int lastCell = header.getLastCellNum();
            for (int i = 0; i < lastCell; i++) {
                String key = HEADER_MAP.get(normalizeHeader(cellToRawString(header.getCell(i))));
                if (key != null) {
                    columns.put(key, i);
                }
            }
        }
        List<String> missing = new ArrayList<>();
        for (String required : REQUIRED_HEADERS) {
            if (!columns.containsKey(required)) {
                missing.add(required);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "Missing required column header(s): " + String.join(", ", missing) + ".");
        }
    }

    private StudentImportRow readDataRow(int rowIndex) {
        Row row = sheet.getRow(rowIndex);
        String firstName = field(row, "firstName");
        String middleName = field(row, "middleName");
        String lastName = field(row, "lastName");
        String birthDate = field(row, "birthDate");
        String gender = field(row, "gender");
        if (firstName.isBlank()
                && middleName.isBlank()
                && lastName.isBlank()
                && birthDate.isBlank()
                && gender.isBlank()) {
            return null;
        }
        return new StudentImportRow(rowIndex + 1, firstName, middleName, lastName, birthDate, gender);
    }

    private String field(Row row, String key) {
        if (row == null) {
            return "";
        }
        Integer index = columns.get(key);
        if (index == null) {
            return "";
        }
        return cellToRawString(row.getCell(index));
    }

    private String cellToRawString(Cell cell) {
        if (cell == null) {
            return "";
        }
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        return switch (type) {
            case STRING -> {
                String text = cell.getStringCellValue();
                yield text == null ? "" : text.trim();
            }
            case NUMERIC -> numericValue(cell);
            case BOOLEAN -> cell.getBooleanCellValue() ? "true" : "false";
            case BLANK, ERROR, FORMULA, _NONE -> "";
        };
    }

    /**
     * Date-formatted cells use the workbook calendar date (SheetJS {@code cellDates} path).
     * Other numbers in {@code (20000, 60000)} use {@code excelSerialToIso}.
     */
    private String numericValue(Cell cell) {
        double serial = cell.getNumericCellValue();
        if (isExcelDate(cell)) {
            return formattedExcelDate(serial);
        }
        if (Double.isFinite(serial) && serial > 20000d && serial < 60000d) {
            return excelSerialToIso(serial);
        }
        return numberToString(serial);
    }

    private String formattedExcelDate(double serial) {
        try {
            LocalDateTime dateTime = DateUtil.getLocalDateTime(serial, date1904);
            return dateTime.toLocalDate().toString();
        } catch (RuntimeException exception) {
            if (Double.isFinite(serial) && serial > 20000d && serial < 60000d) {
                return excelSerialToIso(serial);
            }
            return "";
        }
    }

    private static boolean isExcelDate(Cell cell) {
        try {
            return DateUtil.isCellDateFormatted(cell);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    static String excelSerialToIso(double serial) {
        double epochMs = (serial - 25569d) * 86400d * 1000d;
        if (!Double.isFinite(epochMs)) {
            return "";
        }
        try {
            return LocalDate.ofInstant(Instant.ofEpochMilli(Math.round(epochMs)), ZoneOffset.UTC).toString();
        } catch (DateTimeException exception) {
            return "";
        }
    }

    private static String numberToString(double number) {
        if (Double.isNaN(number)) {
            return "NaN";
        }
        if (number == Double.POSITIVE_INFINITY) {
            return "Infinity";
        }
        if (number == Double.NEGATIVE_INFINITY) {
            return "-Infinity";
        }
        double abs = Math.abs(number);
        if (abs < 1.0e21 && number == Math.rint(number)) {
            return Long.toString((long) number);
        }
        return Double.toString(number);
    }

    static String normalizeHeader(String raw) {
        String value = raw == null ? "" : raw;
        if (!value.isEmpty() && value.charAt(0) == '\uFEFF') {
            value = value.substring(1);
        }
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private static int startRow(Serializable checkpoint) {
        if (checkpoint == null) {
            return FIRST_DATA_ROW;
        }
        if (checkpoint instanceof Integer row) {
            return Math.max(row, FIRST_DATA_ROW);
        }
        if (checkpoint instanceof Long row) {
            return Math.max(Math.toIntExact(row), FIRST_DATA_ROW);
        }
        throw new IllegalStateException(
                "Unrecognized student import checkpoint: " + checkpoint.getClass().getName());
    }

    private static String requiredParameter(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Job parameter '" + name + "' is required");
        }
        return value.trim();
    }
}
