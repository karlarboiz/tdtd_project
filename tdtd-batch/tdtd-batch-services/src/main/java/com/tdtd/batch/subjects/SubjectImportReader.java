package com.tdtd.batch.subjects;

import jakarta.batch.api.BatchProperty;
import jakarta.batch.api.chunk.AbstractItemReader;
import jakarta.inject.Inject;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Reads the first sheet of an .xlsx file. Row 0 is the header. Checkpoint is
 * the 0-based index of the next row to read.
 */
public class SubjectImportReader extends AbstractItemReader {
    private static final String FIELD_NAME = "name";
    private static final String FIELD_SHORT_CODE = "shortCode";
    private static final String FIELD_GRADE_LEVEL = "gradeLevel";

    private static final Map<String, String> HEADER_FIELDS = Map.ofEntries(
            Map.entry("name", FIELD_NAME),
            Map.entry("subject", FIELD_NAME),
            Map.entry("subjectname", FIELD_NAME),
            Map.entry("title", FIELD_NAME),
            Map.entry("shortcode", FIELD_SHORT_CODE),
            Map.entry("code", FIELD_SHORT_CODE),
            Map.entry("abbreviation", FIELD_SHORT_CODE),
            Map.entry("abbr", FIELD_SHORT_CODE),
            Map.entry("gradelevel", FIELD_GRADE_LEVEL),
            Map.entry("grade", FIELD_GRADE_LEVEL),
            Map.entry("level", FIELD_GRADE_LEVEL),
            Map.entry("yearlevel", FIELD_GRADE_LEVEL)
    );

    @Inject
    @BatchProperty(name = "file")
    private String file;

    private Workbook workbook;
    private Sheet sheet;
    private int nextRowIndex = 1;
    private int nameColumn = -1;
    private int gradeLevelColumn = -1;
    private int shortCodeColumn = -1;

    @Override
    public void open(Serializable checkpoint) throws Exception {
        if (file == null || file.isBlank()) {
            throw new IllegalArgumentException("Job parameter file is required");
        }
        Path path = Path.of(file.trim()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new IllegalArgumentException("Excel file not found: " + path);
        }
        if (checkpoint == null) {
            nextRowIndex = 1;
        } else if (checkpoint instanceof Integer) {
            nextRowIndex = (Integer) checkpoint;
        } else {
            throw new IllegalStateException(
                    "Expected row index checkpoint but got " + checkpoint.getClass().getName());
        }

        workbook = new XSSFWorkbook(path.toFile());
        try {
            if (workbook.getNumberOfSheets() == 0) {
                throw new IllegalStateException("The workbook has no sheets");
            }
            sheet = workbook.getSheetAt(0);
            mapColumns(sheet.getRow(0));
        } catch (RuntimeException exception) {
            try {
                workbook.close();
            } catch (Exception closeError) {
                exception.addSuppressed(closeError);
            }
            workbook = null;
            sheet = null;
            throw exception;
        }
    }

    @Override
    public Object readItem() {
        int lastRowIndex = sheet.getLastRowNum();
        while (nextRowIndex <= lastRowIndex) {
            int rowIndex = nextRowIndex;
            nextRowIndex++;
            Row row = sheet.getRow(rowIndex);
            String name = cellText(row, nameColumn);
            String gradeLevel = cellText(row, gradeLevelColumn);
            String shortCode = shortCodeColumn < 0 ? "" : cellText(row, shortCodeColumn);
            if (name.isBlank() && gradeLevel.isBlank() && shortCode.isBlank()) {
                continue;
            }
            return new SubjectImportItem(rowIndex + 1, name, shortCode, gradeLevel);
        }
        return null;
    }

    @Override
    public Serializable checkpointInfo() {
        return nextRowIndex;
    }

    @Override
    public void close() throws Exception {
        if (workbook != null) {
            workbook.close();
            workbook = null;
            sheet = null;
        }
    }

    private void mapColumns(Row header) {
        if (header == null) {
            throw new IllegalStateException("Missing header row");
        }
        Map<String, Integer> columns = new HashMap<>();
        for (Cell cell : header) {
            String field = HEADER_FIELDS.get(normalizeHeader(cellText(cell)));
            if (field != null) {
                columns.put(field, cell.getColumnIndex());
            }
        }
        if (!columns.containsKey(FIELD_NAME) || !columns.containsKey(FIELD_GRADE_LEVEL)) {
            StringBuilder missing = new StringBuilder();
            if (!columns.containsKey(FIELD_NAME)) {
                missing.append(FIELD_NAME);
            }
            if (!columns.containsKey(FIELD_GRADE_LEVEL)) {
                if (missing.length() > 0) {
                    missing.append(", ");
                }
                missing.append(FIELD_GRADE_LEVEL);
            }
            throw new IllegalStateException("Missing required column header(s): " + missing);
        }
        nameColumn = columns.get(FIELD_NAME);
        gradeLevelColumn = columns.get(FIELD_GRADE_LEVEL);
        shortCodeColumn = columns.containsKey(FIELD_SHORT_CODE) ? columns.get(FIELD_SHORT_CODE) : -1;
    }

    /**
     * Header normalize: trim, strip a leading BOM, lowercase, remove whitespace.
     * The last matching synonym wins, same as the frontend parser.
     */
    static String normalizeHeader(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.startsWith("\uFEFF")) {
            value = value.substring(1).trim();
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private static String cellText(Row row, int column) {
        if (row == null || column < 0) {
            return "";
        }
        return cellText(row.getCell(column, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL));
    }

    private static String cellText(Cell cell) {
        if (cell == null) {
            return "";
        }
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        if (type == CellType.STRING) {
            return cell.getStringCellValue().trim();
        }
        if (type == CellType.NUMERIC) {
            return numericToString(cell.getNumericCellValue());
        }
        if (type == CellType.BOOLEAN) {
            return Boolean.toString(cell.getBooleanCellValue());
        }
        return "";
    }

    private static String numericToString(double value) {
        if (!Double.isFinite(value)) {
            return "";
        }
        if (value == Math.rint(value) && value >= Long.MIN_VALUE && value <= Long.MAX_VALUE) {
            return Long.toString((long) value);
        }
        return Double.toString(value);
    }
}
