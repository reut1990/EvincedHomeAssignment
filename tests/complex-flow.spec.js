// Test 2 of 2: a walk through the main widgets on the home page, including a
// form with validation.
//
// The story: load the page, book a consultation (submitting an empty form first,
// to prove the validation stops us), then try the photo slider, the feature
// hotspots, an FAQ answer, the "Why buy with us?" tabs and the footer sign-up.
// Evinced walks behind the whole journey with a notebook - this file just drives
// the page, and the accessibility findings come from its report.
//
// Docs: https://developer.evinced.com/sdks-for-web-apps/playwright-js-sdk/

// The tools: Playwright drives the browser and checks things, EvincedSDK is the
// accessibility scanner, and evinced-aggregate passes what it found to the one
// report global-teardown.js builds at the end of the run.
const { test, expect } = require('@playwright/test');
const { existsSync } = require('node:fs');
const { EvincedSDK } = require('@evinced/js-playwright-sdk');
const { stageIssues, toList } = require('../fixtures/evinced-aggregate');

test.describe('Home page elements and booking flow', () => {
  test('checks the different elements on the page, including form validation', async ({ page }) => {
    // This journey is long. Give it 90 seconds instead of the usual 30.
    test.setTimeout(90000);

    // Everything the scans notice along the way collects in here.
    const found = [];

    const evinced = new EvincedSDK(page);
    // Start watching now, before the site even opens, so nothing is missed.
    await evinced.evStart();

    // Continuous mode only hands its findings over on evStop(), or when the page
    // navigates away. This test never leaves '/', so without this anything that
    // is closed or replaced before the end - the form's first step, the modal,
    // the hotspot panels, the tab panels - is never recorded. flush() ends the
    // current scan and starts a fresh one, so call it while a state is still on
    // screen. The merge at the end drops whatever the scans have in common.
    const flush = async () => {
      found.push(...toList(await evinced.evStop()));
      await evinced.evStart();
    };

    // --- 1. Open the site ---------------------------------------------------
    await page.goto('/');
    await expect(page).toHaveTitle(/Love & Minter/i);
    await expect(page.getByRole('button', { name: 'Book a Consultation' })).toBeVisible();

    // --- 2. Open the booking pop-up -----------------------------------------
    await page.getByRole('button', { name: 'Book a Consultation' }).click();
    // The page hides several pop-ups, so pick the one about "perfect earphones".
    const dialog = page.getByRole('dialog').filter({ hasText: 'perfect earphones' });
    await expect(dialog).toBeVisible();

    // --- 3. Try to continue with an empty form ------------------------------
    // It should refuse to let us through. force: true because the button only
    // pretends to be switched off - a real finger can still press it, so we do too.
    const next = dialog.locator('#next-to-step-2');
    await next.click({ force: true });
    await expect(dialog.locator('#full_name')).toBeVisible(); // good: still on step 1

    // --- 4. Fill it in properly and pick a slot -----------------------------
    await dialog.locator('#full_name').fill('Ada Lovelace');
    await dialog.locator('#email').fill('ada@example.com');
    await dialog.locator('#phone').fill('5551234567');
    await flush(); // step 1 is replaced by step 2 on the next click
    await next.click({ force: true });
    // "Select a Date" showing up means we made it to step 2.
    await expect(dialog.getByText('Select a Date')).toBeVisible();

    // Press the tile you can see, not the radio circle: the circles are invisible
    // and stacked on top of each other, so pressing them picks the wrong one.
    // The days and times change on every visit, so we just take whatever is first.
    await dialog.locator('label[for^="date-label-"]').first().click();
    await dialog.locator('label[for^="time-label-"]').first().click();
    // Check they really got picked, not just that we pressed something.
    await expect(dialog.locator('input[id^="date-label-"]').first()).toBeChecked();
    await expect(dialog.locator('input[id^="time-label-"]').first()).toBeChecked();

    await flush(); // the modal is about to be closed

    // Close the pop-up again.
    await dialog.locator('button[aria-label="Close Modal"]').click();
    await expect(dialog).toBeHidden();

    // --- 5. The "Gaming or Photography?" photo slider -----------------------
    const slider = page.locator('section', { hasText: 'Gaming or Photography?' });
    await expect(slider.getByRole('heading', { name: 'Gaming or Photography?' })).toBeVisible();
    // Both photos are there.
    await expect(slider.getByRole('img')).toHaveCount(2);

    // Drag the handle to the left and check it actually moved. page.mouse is
    // used rather than a click because this handle only responds to a real
    // press-move-release; `steps` matters, since one big jump isn't a drag.
    const handle = slider.locator('split-cursor');
    await handle.scrollIntoViewIfNeeded();
    const beforeDrag = await handle.boundingBox();
    await page.mouse.move(beforeDrag.x + beforeDrag.width / 2, beforeDrag.y + beforeDrag.height / 2);
    await page.mouse.down();
    await page.mouse.move(beforeDrag.x - 100, beforeDrag.y + beforeDrag.height / 2, { steps: 10 });
    await page.mouse.up();
    const afterDrag = await handle.boundingBox();
    expect(afterDrag.x).toBeLessThan(beforeDrag.x);

    // --- 6. The "Incredible Features" hotspots ------------------------------
    // Three dots sit on the photo, each one opening a little description panel.
    const hotspots = page.locator('button.hot-spot__dot');
    await expect(hotspots).toHaveCount(3);
    await hotspots.first().click();
    await expect(page.getByRole('heading', { name: 'Ultra Light' })).toBeVisible();
    await flush(); // this panel is about to be swapped out

    // Pressing the next dot brings its own panel up. We only check the panel we
    // just asked for, never that the last one went away: these panels fade
    // instead of disappearing, and with a scan running alongside the leftovers
    // are not something we can pin down.
    await hotspots.nth(1).click();
    await expect(page.getByRole('heading', { name: 'Durable' })).toBeVisible();

    // Open the third one too, so all three get scanned instead of just one.
    await hotspots.nth(2).click();
    await expect(page.getByRole('heading', { name: /noise cancel/i })).toBeVisible();

    // --- 7. Open an FAQ answer ----------------------------------------------
    // Find the row with this question, then press the little round arrow inside
    // it. Pressing the question text itself does nothing on this site.
    await page.locator('.accordion', { hasText: 'Do you ship overseas?' })
      .locator('button.circle-chevron')
      .click();
    // The answer appearing proves the press actually worked.
    await expect(page.getByText(/we ship all over the world/i)).toBeVisible();

    // --- 8. The "Why buy with us?" tabs -------------------------------------
    // Matched by attribute rather than getByText: the page ships this copy
    // twice - once for these tabs and once for a mobile accordion that is
    // hidden at this width - so searching by text finds two elements.
    const tabs = page.locator('[role="tab"]');
    const panels = page.locator('[role="tabpanel"]');
    await expect(tabs).toHaveCount(3);
    // The first panel is the one showing to start with...
    await expect(panels.first()).toBeVisible();
    await expect(panels.first()).toContainText(/1 day delivery/i);
    await flush(); // this panel is about to be swapped out
    // ...and pressing the second tab swaps which panel is on show.
    await tabs.nth(1).click();
    await expect(panels.nth(1)).toBeVisible();
    await expect(panels.nth(1)).toContainText(/payment processes are guarded/i);
    // Show the third panel too, so it is scanned rather than skipped.
    await tabs.nth(2).click();
    await expect(panels.nth(2)).toBeVisible();

    // --- 9. The footer sign-up ----------------------------------------------
    const signup = page.locator('footer');
    await expect(signup.getByRole('heading', { name: /Sign up for news/i })).toBeVisible();
    const emailBox = signup.locator('input[type="email"]');
    await emailBox.fill('ada@example.com');
    await expect(emailBox).toHaveValue('ada@example.com');
    // We stop here on purpose - actually sending it would sign a made-up address
    // up to a real mailing list on every CI run.

    // Close the last scan, then hand this test's findings to the staging folder
    // the merged report is built from - and check the file really got written.
    found.push(...toList(await evinced.evStop()));
    const staged = stageIssues('complex-flow', found, evinced.screenshotsMap);
    expect(existsSync(staged)).toBeTruthy();
  });
});
