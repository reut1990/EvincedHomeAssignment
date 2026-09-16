// The other half of the answer to "how do you integrate Evinced at scale?".
//
// This is where the boilerplate lives - once. Instead of every spec starting,
// stopping and recording its own scan, a spec imports `test` from here and this
// file does all of it around each test, automatically.
//
// See tests-scaled/example-using-fixture.spec.js for what a spec then looks like.
//
// Docs: https://developer.evinced.com/sdks-for-web-apps/playwright-js-sdk/
const base = require('@playwright/test');
const { EvincedSDK } = require('@evinced/js-playwright-sdk');
const { stageIssues } = require('./evinced-aggregate');

// `.extend()` makes a new `test` that still has everything Playwright's does,
// plus the extra setup described below.
const test = base.test.extend({
  // A fixture is just setup, then the test, then teardown. Everything before
  // `use()` runs first; everything after it runs when the test finishes.
  evinced: [async ({ page }, use, testInfo) => {
    // Before the test: start watching this page.
    const evincedService = new EvincedSDK(page);
    await evincedService.evStart();

    // The test itself runs here.
    await use(evincedService);

    // After the test - pass or fail: stop watching and collect what was found.
    const issues = await evincedService.evStop();

    // Stage it under the test's own name, so two tests never overwrite each
    // other's findings. Non-letters become dashes to keep it a valid filename.
    // global-teardown.js merges every staged file into the one report.
    const safeName = testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    stageIssues(safeName, issues, evincedService.screenshotsMap);
    // `auto: true` is the important bit: this runs for every test in any file
    // that imports `test` from here, even though none of them ask for it by
    // name. That is what makes the integration automatic instead of opt-in.
  }, { auto: true }],
});

// Hand back our `test` and Playwright's untouched `expect`, so a spec only has
// to change where it imports from.
module.exports = { test, expect: base.expect };
