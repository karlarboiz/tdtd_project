package com.tdtd.batch.students;

/**
 * One spreadsheet row failed student validation. Listed as skippable by import-students.
 */
public class InvalidStudentRowException extends RuntimeException {
    private final int rowNumber;

    public InvalidStudentRowException(int rowNumber, String message) {
        super("Row " + rowNumber + ": " + message);
        this.rowNumber = rowNumber;
    }

    public int rowNumber() {
        return rowNumber;
    }
}
