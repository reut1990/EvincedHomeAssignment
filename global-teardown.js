// Runs once after the whole suite: merges every test's findings into the single
// evincedReports/aggregatedReport.html. See fixtures/evinced-aggregate.js.
const { writeAggregatedReport, REPORT_FILE } = require('./fixtures/evinced-aggregate');

async function globalTeardown() {
  const { tests, issues } = await writeAggregatedReport();
  console.log(`Evinced: merged ${tests} test report(s) into ${REPORT_FILE} - ${issues} unique issues`);
}

module.exports = globalTeardown;
