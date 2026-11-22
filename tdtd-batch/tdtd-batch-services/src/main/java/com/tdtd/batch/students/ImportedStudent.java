package com.tdtd.batch.students;

import java.io.Serializable;

/**
 * Validated student ready for {@code POST /api/students/bulk}.
 * {@code middleName} is null when the source cell was blank.
 */
public record ImportedStudent(
        String firstName,
        String middleName,
        String lastName,
        String birthDate,
        String gender
) implements Serializable {
    private static final long serialVersionUID = 1L;
}
