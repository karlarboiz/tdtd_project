package com.tdtd.batch.http;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public final class JsonApiClient {
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final URI base;

    public JsonApiClient(URI base) {
        this.base = base;
    }

    public String get(String path) {
        return send("GET", path, null);
    }

    public String post(String path, Object body) {
        return send("POST", path, body);
    }

    private String send(String method, String path, Object body) {
        try {
            String relative = path.startsWith("/") ? path.substring(1) : path;
            HttpRequest.Builder builder = HttpRequest.newBuilder(base.resolve(relative))
                    .timeout(Duration.ofSeconds(60))
                    .header("Accept", "application/json");
            if (body == null) {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            } else {
                byte[] json = mapper.writeValueAsBytes(body);
                builder.header("Content-Type", "application/json")
                        .method(method, HttpRequest.BodyPublishers.ofByteArray(json));
            }
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ApiException(response.statusCode(), response.body() == null ? "" : response.body());
            }
            return response.body() == null ? "" : response.body();
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ApiException(0, exception.getMessage() == null ? exception.toString() : exception.getMessage());
        }
    }
}
