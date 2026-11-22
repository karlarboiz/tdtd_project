package com.tdtd.batch.http;

public final class ApiException extends RuntimeException {
    private final int statusCode;

    public ApiException(int statusCode, String body) {
        super(statusCode == 0 ? body : statusCode + " " + body);
        this.statusCode = statusCode;
    }

    public int statusCode() {
        return statusCode;
    }
}
