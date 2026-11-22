package com.tdtd.batch.subjects;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tdtd.batch.config.BatchConfig;
import com.tdtd.batch.http.ApiException;
import jakarta.batch.api.BatchProperty;
import jakarta.batch.api.chunk.AbstractItemWriter;
import jakarta.inject.Inject;

import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Posts one subject per item to the school-year registration API.
 * A blank {@code schoolYearId} is resolved once in {@link #open}, not per item.
 */
public class SubjectImportWriter extends AbstractItemWriter {
    @Inject
    @BatchProperty(name = "schoolYearId")
    private String schoolYearId;

    private String resolvedSchoolYearId;

    @Override
    public void open(Serializable checkpoint) throws Exception {
        if (schoolYearId != null && !schoolYearId.isBlank()) {
            resolvedSchoolYearId = schoolYearId.trim();
            return;
        }
        String json = BatchConfig.api().get("/api/school-years/active");
        JsonNode idNode = new ObjectMapper().readTree(json).get("id");
        if (idNode == null || idNode.isNull() || idNode.asText().trim().isEmpty()) {
            throw new IllegalStateException("Active school year response did not include id");
        }
        resolvedSchoolYearId = idNode.asText().trim();
    }

    @Override
    public void writeItems(List<Object> items) {
        for (Object element : items) {
            postOne((SubjectImportItem) element);
        }
    }

    private void postOne(SubjectImportItem item) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("name", item.name());
        body.put("gradeLevel", item.gradeLevel());
        if (item.shortCode() != null && !item.shortCode().isBlank()) {
            body.put("shortCode", item.shortCode());
        }
        String path = "/api/school-years/" + resolvedSchoolYearId + "/subjects";
        try {
            BatchConfig.api().post(path, body);
        } catch (ApiException exception) {
            int status = exception.statusCode();
            if (status == 409) {
                throw skipped(item, exception);
            }
            if (status >= 400 && status < 500) {
                throw skipped(item, exception);
            }
            throw exception;
        }
    }

    private static SubjectImportSkipException skipped(SubjectImportItem item, ApiException exception) {
        String detail = exception.getMessage() == null ? "" : exception.getMessage();
        return new SubjectImportSkipException("Row " + item.excelRow() + ": " + detail, exception);
    }
}
