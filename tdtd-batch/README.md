# tdtd-batch

Scheduled Java jobs for Teacher's Dilemma Today (Quartz + SQLite).

**Documentation:** [.cursor/documentation/TDTD-Batch-Function.md](../.cursor/documentation/TDTD-Batch-Function.md)

## Build

```bash
cd tdtd-batch
mvn -q package
```

## Run (daemon)

Set `TDTD_DB_PATH` to the same file as `tdtd-node` (default: `data/teacher_app.sqlite` relative to cwd).

```bash
export TDTD_DB_PATH=../tdtd-node/data/teacher_app.sqlite
export TDTD_TIMEZONE=Asia/Manila
java -jar tdtd-batch-app/target/tdtd-batch-app.jar
```

## Run once (Task Scheduler / manual)

```bash
TDTD_BATCH_RUN_ONCE=AM java -jar tdtd-batch-app/target/tdtd-batch-app.jar
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `TDTD_DB_PATH` | `data/teacher_app.sqlite` | SQLite path (shared with tdtd-node) |
| `TDTD_TIMEZONE` | `Asia/Manila` | Calendar “today” for jobs |
| `TDTD_CRON_AM` | `0 0 7 * * ?` | Quartz cron (07:00) |
| `TDTD_CRON_PM` | `0 30 12 * * ?` | Quartz cron (12:30) |
| `TDTD_BATCH_RUN_ONCE` | — | `AM` or `PM` then exit |
