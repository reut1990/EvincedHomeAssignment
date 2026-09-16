// Test 1 of 2: the simple case - one page, one state, one scan.
//
// The story: open the home page, check the main navigation is all there, then
// hand the page to Evinced for a single snapshot scan and save what it found.
//
// Docs: https://developer.evinced.com/sdks-for-web-apps/playwright-js-sdk/

// The tools: Playwright drives the browser and checks things, EvincedSDK is the
// accessibility scanner, and evinced-aggregate passes what it found to the one
// report global-teardown.js builds at the end of the run.
const { test, expect } = require('@playwright/test');
const { existsSync } = require('node:fs');
const { EvincedSDK } = require('@evinced/js-playwright-sdk');
const { stageIssues } = require('../fixtures/evinced-aggregate');

test.describe('Home page navigation', () => {
  test('navigating to the home page loads Love & Minter', async ({ page }) => {
    // Open the site. '/' is filled in from baseURL in playwright.config.js.
    await page.goto('/');

    // The right page loaded, and the whole main menu is on screen.
    await expect(page).toHaveTitle(/Love & Minter/i);
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Catalog' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Book a Consultation' })).toBeVisible();

    // One snapshot scan of what is on screen right now. Nothing on this page
    // moves or changes, so a single evAnalyze() catches everything - the
    // multi-step test uses evStart/evStop to watch changes over time instead.
    const evincedService = new EvincedSDK(page);
    const issues = await evincedService.evAnalyze();

    // Hand what it found to the staging folder the merged report is built from,
    // then make sure the file really got written.
    const staged = stageIssues('simple-navigation', issues, evincedService.screenshotsMap);
    expect(existsSync(staged)).toBeTruthy();
  });
});
