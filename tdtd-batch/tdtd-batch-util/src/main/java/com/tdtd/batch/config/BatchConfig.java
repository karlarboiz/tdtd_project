package com.tdtd.batch.config;

import com.tdtd.batch.http.JsonApiClient;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Shared settings for every batch job.
 * {@code TDTD_API_BASE} defaults to http://localhost:3000.
 * {@code TDTD_DB_PATH} defaults to the Node app database when that file can be found.
 */
public final class BatchConfig {
    private static final URI DEFAULT_API = URI.create("http://localhost:3000");

    private BatchConfig() {
    }

    public static URI apiBase() {
        String raw = System.getenv("TDTD_API_BASE");
        if (raw == null || raw.isBlank()) {
            return DEFAULT_API;
        }
        String trimmed = raw.trim();
        if (!trimmed.endsWith("/")) {
            trimmed = trimmed + "/";
        }
        return URI.create(trimmed);
    }

    public static Path dbPath() {
        String raw = System.getenv("TDTD_DB_PATH");
        if (raw != null && !raw.isBlank()) {
            return Path.of(raw.trim()).toAbsolutePath().normalize();
        }
        Path cwd = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        Path nested = cwd.resolve("tdtd-node").resolve("data").resolve("teacher_app.sqlite");
        if (Files.exists(nested)) {
            return nested;
        }
        Path sibling = cwd.resolve("..").resolve("tdtd-node").resolve("data").resolve("teacher_app.sqlite");
        return sibling.normalize();
    }

    public static JsonApiClient api() {
        return new JsonApiClient(apiBase());
    }
}
