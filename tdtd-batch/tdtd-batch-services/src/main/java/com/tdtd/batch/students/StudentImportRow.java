package com.tdtd.batch.students;

import java.io.Serializable;

/**
 * One non-empty data row before validation. {@code excelRow} is the 1-based sheet row.
 */
public record StudentImportRow(
        int excelRow,
        String firstName,
        String middleName,
        String lastName,
        String birthDate,
        String gender
) implements Serializable {
    private static final long serialVersionUID = 1L;
}
