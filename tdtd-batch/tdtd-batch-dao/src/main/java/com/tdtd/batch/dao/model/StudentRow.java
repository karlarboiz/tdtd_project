package com.tdtd.batch.dao.model;

public record StudentRow(
    String id,
    String firstName,
    String middleName,
    String lastName,
    String classId) {

  public String displayName() {
    StringBuilder sb = new StringBuilder();
    sb.append(firstName);
    if (middleName != null && !middleName.isBlank()) {
      if (!sb.isEmpty()) sb.append(' ');
      sb.append(middleName);
    }
    if (!lastName.isBlank()) {
      if (!sb.isEmpty()) sb.append(' ');
      sb.append(lastName);
    }
    return sb.toString();
  }
}
