package com.tdtd.batch.recents;

import jakarta.batch.api.AbstractBatchlet;
import jakarta.batch.api.BatchProperty;
import jakarta.inject.Inject;

/**
 * Purges activity_logs rows older than the required retainDays job parameter.
 * 90 days is the shortest period this job will delete.
 */
public class ActivityLogRetentionBatchlet extends AbstractBatchlet {
    @Inject
    @BatchProperty(name = "retainDays")
    private String retainDays;

    @Override
    public String process() throws Exception {
        int days = parseRetainDays(retainDays);
        int deleted = ActivityLogDao.deleteOlderThan(days);
        return "deleted=" + deleted;
    }

    /**
     * The runtime marks the step STOPPED after this returns.
     * The purge is one delete, so there is nothing further to cancel.
     */
    @Override
    public void stop() throws Exception {
    }

    private static int parseRetainDays(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("retainDays is required");
        }
        int days;
        try {
            days = Integer.parseInt(raw.trim());
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("retainDays must be an integer", exception);
        }
        if (days < ActivityLogDao.MINIMUM_RETAIN_DAYS) {
            throw new IllegalArgumentException(
                    "retainDays must be at least " + ActivityLogDao.MINIMUM_RETAIN_DAYS);
        }
        return days;
    }
}
