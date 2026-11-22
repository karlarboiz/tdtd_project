package com.tdtd.batch.dao;

import com.tdtd.batch.config.BatchConfig;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Opens the existing teacher SQLite file. Does not create tables and does not change journal mode.
 */
public final class AppDatabase {
    static {
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException exception) {
            throw new IllegalStateException("sqlite-jdbc is not on the classpath", exception);
        }
    }

    private AppDatabase() {
    }

    public static Connection open() throws SQLException {
        String url = "jdbc:sqlite:" + BatchConfig.dbPath();
        Connection connection = DriverManager.getConnection(url);
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
        }
        return connection;
    }
}
