// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['tests/**/*.spec.js', 'tests-scaled/**/*.spec.js'],
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    // Standard Playwright HTML report (screenshots, traces, video on failure).
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    // No Evinced reporter here on purpose: it only ever receives results from
    // evStop(), so a test using evAnalyze() would be missing from its report.
    // global-teardown.js builds the accessibility report instead, from findings
    // every test stages itself. See fixtures/evinced-aggregate.js.
  ],

  // Runs once before the whole suite: authenticates the Evinced SDK so every
  // test/worker can call EvincedSDK methods without repeating auth boilerplate.
  globalSetup: require.resolve('./global-setup.js'),

  // Runs once after it: merges every test's findings, whichever scanning mode it
  // used, into the single evincedReports/aggregatedReport.html that CI uploads.
  globalTeardown: require.resolve('./global-teardown.js'),

  use: {
    baseURL: 'https://a11y-audits.com',
    trace: 'retain-on-failure',
    // Force a screenshot after every step (pass or fail) so the HTML report always
    // has visual evidence of each page state the test walked through.
    screenshot: 'on',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
