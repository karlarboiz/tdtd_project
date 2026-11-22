package com.tdtd.batch.deped;

/**
 * One CSV row of the deped-report extract.
 * Score fields are null when the student has no matching score entry.
 */
public record DepedReportRow(
        String className,
        String shift,
        String studentId,
        String lastName,
        String firstName,
        String middleName,
        int attendancePresent,
        int attendanceAbsent,
        int attendanceLate,
        String subjectName,
        String scoreKind,
        String scoreTitle,
        String scoreDate,
        Double score,
        Double maxScore) {
}
