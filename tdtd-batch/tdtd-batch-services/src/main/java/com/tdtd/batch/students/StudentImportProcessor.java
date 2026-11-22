package com.tdtd.batch.students;

import jakarta.batch.api.chunk.ItemProcessor;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Trims and validates a row the same way as {@code student.service.ts}.
 * Invalid rows throw {@link InvalidStudentRowException}, which the job skips.
 * Jakarta Batch provides {@code ItemProcessor} only; there is no abstract processor class.
 */
public class StudentImportProcessor implements ItemProcessor {
    private static final Pattern ISO_DATE = Pattern.compile("^[0-9]{4}-[0-9]{2}-[0-9]{2}$");

    @Override
    public Object processItem(Object item) {
        if (!(item instanceof StudentImportRow row)) {
            throw new IllegalStateException("Unexpected student import item");
        }
        String firstName = trim(row.firstName());
        String lastName = trim(row.lastName());
        if (firstName.isEmpty()) {
            throw new InvalidStudentRowException(row.excelRow(), "firstName is required");
        }
        if (lastName.isEmpty()) {
            throw new InvalidStudentRowException(row.excelRow(), "lastName is required");
        }
        String birthDate = assertBirthDate(row.excelRow(), row.birthDate());
        String gender = normalizeGender(row.excelRow(), row.gender());
        return new ImportedStudent(firstName, normalizeMiddle(row.middleName()), lastName, birthDate, gender);
    }

    private static String assertBirthDate(int excelRow, String raw) {
        String value = trim(raw);
        if (!ISO_DATE.matcher(value).matches()) {
            throw new InvalidStudentRowException(excelRow, "birthDate must be YYYY-MM-DD");
        }
        int year = Integer.parseInt(value.substring(0, 4));
        int month = Integer.parseInt(value.substring(5, 7));
        int day = Integer.parseInt(value.substring(8, 10));
        try {
            LocalDate date = LocalDate.of(year, month, day);
            if (date.getYear() != year || date.getMonthValue() != month || date.getDayOfMonth() != day) {
                throw new InvalidStudentRowException(excelRow, "birthDate is not a valid calendar date");
            }
        } catch (DateTimeException exception) {
            throw new InvalidStudentRowException(excelRow, "birthDate is not a valid calendar date");
        }
        return value;
    }

    private static String normalizeGender(int excelRow, String raw) {
        String value = trim(raw).toUpperCase(Locale.ROOT);
        return switch (value) {
            case "M", "MALE" -> "M";
            case "F", "FEMALE" -> "F";
            case "O", "OTHER" -> "O";
            default -> throw new InvalidStudentRowException(
                    excelRow, "gender must be M / F / O or Male / Female / Other");
        };
    }

    private static String normalizeMiddle(String middleName) {
        String value = trim(middleName);
        return value.isEmpty() ? null : value;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
