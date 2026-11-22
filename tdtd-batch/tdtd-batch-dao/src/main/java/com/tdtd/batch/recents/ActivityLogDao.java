package com.tdtd.batch.recents;

import com.tdtd.batch.dao.AppDatabase;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

/**
 * Deletes old teacher activity rows. Does not create tables or insert a purge record.
 */
public final class ActivityLogDao {
    /** Shortest history this purge may keep. Younger rows are never deleted. */
    public static final int MINIMUM_RETAIN_DAYS = 90;

    private ActivityLogDao() {
    }

    /**
     * Deletes rows with {@code created_at} older than {@code retainDays} whole days.
     *
     * @return the number of rows deleted
     * @throws IllegalArgumentException if {@code retainDays} is below {@link #MINIMUM_RETAIN_DAYS}
     */
    public static int deleteOlderThan(int retainDays) throws SQLException {
        if (retainDays < MINIMUM_RETAIN_DAYS) {
            throw new IllegalArgumentException("retainDays must be at least " + MINIMUM_RETAIN_DAYS);
        }
        long cutoff = System.currentTimeMillis() - retainDays * 86400000L;
        try (Connection connection = AppDatabase.open();
             PreparedStatement statement = connection.prepareStatement(
                     "DELETE FROM activity_logs WHERE created_at < ?")) {
            statement.setLong(1, cutoff);
            return statement.executeUpdate();
        }
    }
}
