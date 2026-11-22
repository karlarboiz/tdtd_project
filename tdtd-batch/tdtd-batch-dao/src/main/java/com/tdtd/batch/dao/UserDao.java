package com.tdtd.batch.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public final class UserDao {
  private static final String LIST_ACTIVE =
      """
      SELECT id FROM users
      WHERE is_active = 1
      ORDER BY created_at ASC
      """;

  public List<String> listActiveUserIds(Connection conn) throws SQLException {
    List<String> ids = new ArrayList<>();
    try (PreparedStatement ps = conn.prepareStatement(LIST_ACTIVE);
        ResultSet rs = ps.executeQuery()) {
      while (rs.next()) {
        ids.add(rs.getString("id"));
      }
    }
    return ids;
  }
}
