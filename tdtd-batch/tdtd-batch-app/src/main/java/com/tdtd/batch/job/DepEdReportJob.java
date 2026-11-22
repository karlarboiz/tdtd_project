package com.tdtd.batch.job;

import com.tdtd.batch.service.DepEdPdfService;
import com.tdtd.batch.util.BatchConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class DepEdReportJob {
  private static final Logger LOG = LoggerFactory.getLogger(DepEdReportJob.class);

  private DepEdReportJob() {}

  public static void run(BatchConfig config) throws Exception {
    LOG.info("DepEd report job starting");
    DepEdPdfService.runFromEnvironment(config);
  }
}
