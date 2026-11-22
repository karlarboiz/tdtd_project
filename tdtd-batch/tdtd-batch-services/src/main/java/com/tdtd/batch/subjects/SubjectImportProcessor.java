package com.tdtd.batch.subjects;

import jakarta.batch.api.chunk.ItemProcessor;

public class SubjectImportProcessor implements ItemProcessor {
    @Override
    public Object processItem(Object item) {
        SubjectImportItem source = (SubjectImportItem) item;
        String name = source.name() == null ? "" : source.name().trim();
        String gradeLevel = source.gradeLevel() == null ? "" : source.gradeLevel().trim();
        if (name.isEmpty() || gradeLevel.isEmpty()) {
            String reason;
            if (name.isEmpty() && gradeLevel.isEmpty()) {
                reason = "name and gradeLevel are required";
            } else if (name.isEmpty()) {
                reason = "name is required";
            } else {
                reason = "gradeLevel is required";
            }
            throw new SubjectImportSkipException("Row " + source.excelRow() + ": " + reason);
        }
        String shortCode = source.shortCode() == null ? "" : source.shortCode().trim();
        return new SubjectImportItem(
                source.excelRow(),
                name,
                shortCode.isEmpty() ? null : shortCode,
                gradeLevel);
    }
}
