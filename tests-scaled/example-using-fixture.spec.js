// Assignment question 5: "How can you integrate Evinced to all tests at scale?
// Show an example." This file is the example.
//
// Without the trick below, every spec in the suite needs its own copy of this:
//
//     const evinced = new EvincedSDK(page);
//     await evinced.evStart();
//     ... the actual test ...
//     const issues = await evinced.evStop();
//     stageIssues('some-test-name', issues);
//
// Five lines to paste into hundreds of files, easy to forget when someone adds
// a new test, and five lines to go and edit again the day anything about the
// reporting changes. That is what "at scale" is really asking about.
//
// The two tests below contain none of it - and both are still scanned, and both
// still reach the merged accessibility report.
//
// Only this folder uses the fixture. tests/ calls the SDK by hand on purpose, to
// show the raw mechanics and the two scanning modes; in a real suite every spec
// would look like the ones below.
//
// Docs: https://developer.evinced.com/sdks-for-web-apps/playwright-js-sdk/

// The whole trick is this line: `test` comes from our own fixture instead of
// straight from Playwright. The fixture wraps Evinced around every test that
// uses it. Adopting this across an existing suite is a find-and-replace on this
// one import, and every test written afterwards is scanned for free.
const { test, expect } = require('../fixtures/evinced-fixtures');

test.describe('Scaled Evinced integration example', () => {
  test('home page is scanned automatically via the shared fixture', async ({ page }) => {
    // From here on it is an ordinary test. Nothing about accessibility appears.
    await page.goto('/');
    await expect(page).toHaveTitle(/Love & Minter/i);
  });

  test('catalog page is scanned automatically via the shared fixture', async ({ page }) => {
    // A second page, to show each test is scanned separately and gets its own
    // report file rather than the two sharing one.
    await page.goto('/collections/all');
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });
});
