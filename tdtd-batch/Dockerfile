# syntax=docker/dockerfile:1

FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml ./
COPY tdtd-batch-app/pom.xml tdtd-batch-app/
COPY tdtd-batch-dao/pom.xml tdtd-batch-dao/
COPY tdtd-batch-services/pom.xml tdtd-batch-services/
COPY tdtd-batch-util/pom.xml tdtd-batch-util/
RUN mvn -B -q dependency:go-offline
COPY . ./
RUN mvn -B -q package -pl tdtd-batch-app -am \
  && JAR=$(ls tdtd-batch-app/target/tdtd-batch-app-*.jar | grep -v original | head -1) \
  && cp "$JAR" tdtd-batch-app/target/tdtd-batch-app.jar

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /build/tdtd-batch-app/target/tdtd-batch-app.jar ./tdtd-batch-app.jar
CMD ["java", "-jar", "tdtd-batch-app.jar"]
