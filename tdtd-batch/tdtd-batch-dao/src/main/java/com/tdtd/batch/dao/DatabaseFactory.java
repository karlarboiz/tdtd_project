package com.tdtd.batch.dao;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class DatabaseFactory {
  private static final Logger LOG = LoggerFactory.getLogger(DatabaseFactory.class);

  private DatabaseFactory() {}

  public static Connection open(Path dbPath) throws SQLException {
    if (!Files.exists(dbPath)) {
      LOG.warn("Database file does not exist yet: {} — tdtd-node migrate will create it on first API start", dbPath);
    }
    String url = "jdbc:sqlite:" + dbPath.toAbsolutePath();
    Connection conn = DriverManager.getConnection(url);
    try (var st = conn.createStatement()) {
      st.execute("PRAGMA foreign_keys = ON");
    }
    return conn;
  }
}
