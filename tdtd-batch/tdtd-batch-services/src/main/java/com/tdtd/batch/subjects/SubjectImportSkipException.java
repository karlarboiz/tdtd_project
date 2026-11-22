package com.tdtd.batch.subjects;

/**
 * A row the chunk may skip: invalid spreadsheet data, an already-registered
 * subject, or another 4xx validation response. 5xx and connection failures
 * use {@link com.tdtd.batch.http.ApiException} instead so the step fails.
 */
public class SubjectImportSkipException extends RuntimeException {
    public SubjectImportSkipException(String message) {
        super(message);
    }

    public SubjectImportSkipException(String message, Throwable cause) {
        super(message, cause);
    }
}
