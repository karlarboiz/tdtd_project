package com.tdtd.batch.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.tdtd.batch.dao.model.ClassRow;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DepEdReportDaoTest {
  private Connection conn;
  private final DepEdReportDao dao = new DepEdReportDao();

  @BeforeEach
  void setUp() throws Exception {
    conn = DriverManager.getConnection("jdbc:sqlite::memory:");
    try (Statement st = conn.createStatement()) {
      st.execute(
          "CREATE TABLE users (id TEXT PRIMARY KEY, is_active INTEGER NOT NULL DEFAULT 1)");
      st.execute(
          """
          CREATE TABLE classes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            shift TEXT NOT NULL
          )
          """);
      st.execute(
          """
          CREATE TABLE school_settings (
            user_id TEXT NOT NULL,
            school_name TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
          """);
      st.execute(
          """
          CREATE TABLE students (
            id TEXT PRIMARY KEY,
            class_id TEXT NOT NULL,
            first_name TEXT NOT NULL,
            middle_name TEXT,
            last_name TEXT NOT NULL
          )
          """);
      st.execute("INSERT INTO users VALUES ('user-a', 1), ('user-b', 1)");
      st.execute(
          """
          INSERT INTO classes VALUES
            ('class-a', 'user-a', 'Grade 5-A', 'MRNG'),
            ('class-b', 'user-b', 'Grade 6-B', 'AFTNN')
          """);
      st.execute(
          """
          INSERT INTO school_settings VALUES
            ('user-a', 'Alpha School', 100),
            ('user-b', 'Beta School', 200)
          """);
      st.execute(
          """
          INSERT INTO students VALUES
            ('stu-a', 'class-a', 'Ana', NULL, 'Reyes'),
            ('stu-b', 'class-b', 'Ben', NULL, 'Cruz')
          """);
    }
  }

  @AfterEach
  void tearDown() throws Exception {
    if (conn != null) {
      conn.close();
    }
  }

  @Test
  void getSchoolName_returnsOwningTeacherSettings() throws Exception {
    assertEquals("Alpha School", dao.getSchoolName(conn, "user-a"));
    assertEquals("Beta School", dao.getSchoolName(conn, "user-b"));
  }

  @Test
  void getClass_returnsNullForCrossTenantAccess() throws Exception {
    ClassRow owned = dao.getClass(conn, "user-a", "class-a");
    assertNotNull(owned);
    assertEquals("Grade 5-A", owned.name());

    assertNull(dao.getClass(conn, "user-b", "class-a"));
  }

  @Test
  void listStudentsByClass_scopesToOwningTeacher() throws Exception {
    assertEquals(1, dao.listStudentsByClass(conn, "user-a", "class-a").size());
    assertEquals(0, dao.listStudentsByClass(conn, "user-b", "class-a").size());
    assertEquals(1, dao.listStudentsByClass(conn, "user-b", "class-b").size());
  }
}
