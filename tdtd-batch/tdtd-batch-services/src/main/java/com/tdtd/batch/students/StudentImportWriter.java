package com.tdtd.batch.students;

import com.tdtd.batch.config.BatchConfig;

import jakarta.batch.api.BatchProperty;
import jakarta.batch.api.chunk.AbstractItemWriter;
import jakarta.inject.Inject;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Posts each chunk to {@code /api/students/bulk}. Node writes the rows and the import activity log.
 */
public class StudentImportWriter extends AbstractItemWriter {
    @Inject
    @BatchProperty(name = "classId")
    private String classId;

    private String classIdValue;

    @Override
    public void open(Serializable checkpoint) {
        if (classId == null || classId.isBlank()) {
            throw new IllegalStateException("Job parameter 'classId' is required");
        }
        classIdValue = classId.trim();
    }

    @Override
    public void writeItems(List<Object> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        if (classIdValue == null || classIdValue.isBlank()) {
            throw new IllegalStateException("Job parameter 'classId' is required");
        }

        List<Map<String, String>> students = new ArrayList<>(items.size());
        for (Object item : items) {
            if (!(item instanceof ImportedStudent student)) {
                throw new IllegalStateException("Unexpected student import item");
            }
            Map<String, String> row = new LinkedHashMap<>();
            row.put("firstName", student.firstName());
            if (student.middleName() != null && !student.middleName().isBlank()) {
                row.put("middleName", student.middleName());
            }
            row.put("lastName", student.lastName());
            row.put("birthDate", student.birthDate());
            row.put("gender", student.gender());
            students.add(row);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("classId", classIdValue);
        body.put("students", students);
        BatchConfig.api().post("/api/students/bulk", body);
    }
}
