package com.tdtd.batch.app;

import jakarta.batch.runtime.BatchRuntime;
import jakarta.batch.runtime.BatchStatus;
import jakarta.batch.runtime.JobExecution;
import jakarta.batch.operations.JobOperator;

import java.util.Properties;

/**
 * Usage: java -jar tdtd-batch-app.jar job-name key=value ...
 * Jobs: import-students, import-subjects, deped-report, activity-log-retention
 */
public final class Main {
    private Main() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1 || args[0].isBlank()) {
            System.err.println("Usage: java -jar tdtd-batch-app.jar <jobName> key=value ...");
            System.err.println("Jobs: import-students, import-subjects, deped-report, activity-log-retention");
            System.exit(2);
            return;
        }

        String jobName = args[0].trim();
        Properties parameters = new Properties();
        for (int i = 1; i < args.length; i++) {
            int eq = args[i].indexOf('=');
            if (eq <= 0) {
                throw new IllegalArgumentException("Expected key=value, got: " + args[i]);
            }
            parameters.setProperty(args[i].substring(0, eq), args[i].substring(eq + 1));
        }

        JobOperator operator = BatchRuntime.getJobOperator();
        long executionId = operator.start(jobName, parameters);
        BatchStatus status = waitFor(operator, executionId);
        JobExecution execution = operator.getJobExecution(executionId);
        System.out.println(jobName + " execution " + executionId + " " + status);
        if (execution.getExitStatus() != null && !execution.getExitStatus().isBlank()) {
            System.out.println(execution.getExitStatus());
        }
        if (status != BatchStatus.COMPLETED) {
            System.exit(1);
        }
    }

    private static BatchStatus waitFor(JobOperator operator, long executionId) throws InterruptedException {
        BatchStatus status = operator.getJobExecution(executionId).getBatchStatus();
        while (status == BatchStatus.STARTING || status == BatchStatus.STARTED) {
            Thread.sleep(200);
            status = operator.getJobExecution(executionId).getBatchStatus();
        }
        return status;
    }
}
