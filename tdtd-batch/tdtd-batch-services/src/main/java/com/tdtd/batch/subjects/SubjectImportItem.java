package com.tdtd.batch.subjects;

/**
 * One non-empty spreadsheet row. {@code excelRow} is the 1-based sheet row.
 * {@code shortCode} is null when the cell is blank.
 */
public final class SubjectImportItem {
    private final int excelRow;
    private final String name;
    private final String shortCode;
    private final String gradeLevel;

    public SubjectImportItem(int excelRow, String name, String shortCode, String gradeLevel) {
        this.excelRow = excelRow;
        this.name = name;
        this.shortCode = shortCode;
        this.gradeLevel = gradeLevel;
    }

    public int excelRow() {
        return excelRow;
    }

    public String name() {
        return name;
    }

    public String shortCode() {
        return shortCode;
    }

    public String gradeLevel() {
        return gradeLevel;
    }
}
