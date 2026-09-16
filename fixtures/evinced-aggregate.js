// One report for the whole run, whichever scanning mode each test used.
//
// The Evinced reporter that ships with the SDK only ever sees results from
// evStop() - evAnalyze() hands its findings straight back to the caller and
// writes nothing - so a suite that mixes the two modes can never produce a
// single complete report through it.
//
// This does the same job the SDK's own reporter does, just from a source every
// test can reach: each test drops whatever its scan returned into a staging
// folder as JSON, and global-teardown.js merges the lot into one report using
// the SDK's own saveReport() and getOnlyUniqueIssues().
const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { saveReport, getOnlyUniqueIssues } = require('@evinced/js-playwright-sdk');

// Staging area for the per-test JSON, and the single report we end up with.
const ISSUES_DIR = path.join('test-results', 'evinced-issues');
const REPORT_FILE = path.join('evincedReports', 'aggregatedReport.html');

// A scan hands back either a plain array or an { report } wrapper. This makes
// both look the same, without touching the issue objects themselves.
function toList(issues) {
  if (Array.isArray(issues)) return issues;
  return (issues && issues.report) || [];
}

// Called by a test with whatever its scans returned, plus the SDK's own
// screenshotsMap: the screenshots live apart from the issues and are looked up
// by id when the report is drawn, so a report built without them shows the
// findings with no picture attached. The objects are written through untouched,
// so nothing here depends on their shape.
function stageIssues(testName, issues, screenshots) {
  mkdirSync(ISSUES_DIR, { recursive: true });
  const file = path.join(ISSUES_DIR, `${testName}.json`);
  writeFileSync(file, JSON.stringify({
    issues: toList(issues),
    screenshots: Object.assign({}, screenshots),
  }));
  return file;
}

// Called once after the whole run, from global-teardown.js.
async function writeAggregatedReport() {
  if (!existsSync(ISSUES_DIR)) return { tests: 0, issues: 0 };

  const files = readdirSync(ISSUES_DIR).filter((f) => f.endsWith('.json'));
  const all = [];
  const screenshots = {};
  for (const file of files) {
    const staged = JSON.parse(readFileSync(path.join(ISSUES_DIR, file), 'utf8'));
    all.push(...staged.issues);
    // Screenshot ids are unique per scan, so the maps just stack up.
    Object.assign(screenshots, staged.screenshots);
  }

  // De-duplicate the way the SDK's own reporter does, so the overlap between
  // tests that visited the same page collapses into one entry. It keeps the
  // first copy of each issue it meets, so put the copies that have a picture at
  // the front: the same issue can be found by a short scan that never finished
  // its screenshot and again by a longer one that did, and we want the one we
  // can show.
  const hasImage = (issue) => Boolean(issue.screenshotId && screenshots[issue.screenshotId]);
  const unique = getOnlyUniqueIssues([...all.filter(hasImage), ...all.filter((i) => !hasImage(i))]);
  mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  await saveReport(unique, 'html', REPORT_FILE, screenshots);
  return { tests: files.length, issues: unique.length };
}

module.exports = { stageIssues, writeAggregatedReport, toList, ISSUES_DIR, REPORT_FILE };
