# syntax=docker/dockerfile:1

FROM maven:3.9-eclipse-temurin-17 AS batch-builder
WORKDIR /build/tdtd-batch
COPY tdtd-batch/pom.xml ./
COPY tdtd-batch/tdtd-batch-app/pom.xml tdtd-batch-app/
COPY tdtd-batch/tdtd-batch-dao/pom.xml tdtd-batch-dao/
COPY tdtd-batch/tdtd-batch-services/pom.xml tdtd-batch-services/
COPY tdtd-batch/tdtd-batch-util/pom.xml tdtd-batch-util/
RUN mvn -B -q dependency:go-offline
COPY tdtd-batch/ ./
RUN mvn -B -q package -pl tdtd-batch-app -am \
  && JAR=$(ls tdtd-batch-app/target/tdtd-batch-app-*.jar | grep -v original | head -1) \
  && cp "$JAR" tdtd-batch-app/target/tdtd-batch-app.jar

FROM node:22-bookworm AS node-builder
WORKDIR /build/tdtd-node
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY tdtd-node/package.json tdtd-node/package-lock.json ./
RUN npm ci
COPY tdtd-node/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jre-headless curl \
  && rm -rf /var/lib/apt/lists/*
COPY tdtd-node/package.json tdtd-node/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=node-builder /build/tdtd-node/dist ./dist
COPY --from=batch-builder /build/tdtd-batch/tdtd-batch-app/target/tdtd-batch-app.jar /opt/tdtd/tdtd-batch-app.jar
RUN mkdir -p /data/reports /data/backups
ENV TDTD_REPORT_OUTPUT_DIR=/data/reports
EXPOSE 3000
CMD ["node", "dist/server.js"]
