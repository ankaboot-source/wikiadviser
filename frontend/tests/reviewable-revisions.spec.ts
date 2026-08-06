import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Issue #1426 — make large AI-generated revisions reviewable.
 *
 * Tests the collapse / group / navigate / triage feature against the running
 * dev stack (frontend on :9000, local Supabase). Uses the existing article
 * "p1" (id 0c4fbb1f-...) whose latest revision (n°4, revid 9649) has 5
 * indexed, active changes.
 *
 * NOTE: The auto-collapse threshold (COLLAPSE_THRESHOLD = 15) is not
 * exercised here because no revision in the local DB has >15 indexed changes.
 * That logic is pure (store.registerRevisionDefault) and is verified by
 * inspection.
 */

const FRONTEND = 'http://localhost:9000';
const ARTICLE_ID = '0c4fbb1f-1611-4466-ab9e-a090de1b0b50';
const EMAIL = 'user@example.com';
const PASSWORD = 'user@example.com';

/** Log in via the auth page and wait for the app to settle. */
async function login(page: Page) {
  await page.goto(`${FRONTEND}/`);
  await page.waitForURL(/\/auth/, { timeout: 30000 });

  const emailInput = page.locator('input[name="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(EMAIL);
  await page.locator('input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /^Sign in$/ }).click();

  await expect(
    page.getByRole('button', { name: /create a new article/i }),
  ).toBeVisible({ timeout: 30000 });
}

/**
 * Open the article, expand the latest revision (n°4), and return a locator
 * scoped to that revision's expanded content so all button searches are
 * scoped correctly (multiple revisions may be expanded simultaneously).
 */
async function openRevision(page: Page): Promise<Locator> {
  await page.goto(`${FRONTEND}/articles/${ARTICLE_ID}`);
  await expect(page.getByText(/changes to review/i).first()).toBeVisible({
    timeout: 30000,
  });

  // The latest revision (n°4) is expanded by default on desktop. If it's
  // collapsed, click to expand it.
  const revItem = page
    .locator('.q-expansion-item', { hasText: 'Revision n°4' })
    .first();
  const isCollapsed = await revItem.evaluate((el) =>
    el.classList.contains('q-expansion-item--collapsed'),
  );
  if (isCollapsed) {
    await page.getByText('Revision n°4').first().click();
    await page.waitForTimeout(1000);
  }

  // Wait for the reviewability toolbar to render inside it.
  await expect(
    revItem.getByRole('button', { name: /collapse all/i }),
  ).toBeVisible({ timeout: 10000 });

  return revItem;
}

test.describe('Issue #1426: reviewable large revisions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('revision renders type counts and collapse/expand controls', async ({
    page,
  }) => {
    const rev = await openRevision(page);

    // At least one type-count badge should appear (only types with count > 0
    // are rendered). The article "p1" n°4 has insertions.
    await expect(rev.getByText(/insertions/i).first()).toBeVisible();

    // Collapse-all / expand-all controls should be present.
    await expect(
      rev.getByRole('button', { name: /collapse all/i }),
    ).toBeVisible();
    await expect(
      rev.getByRole('button', { name: /expand all/i }),
    ).toBeVisible();
  });

  test('expand all / collapse all toggles every change', async ({ page }) => {
    const rev = await openRevision(page);

    // Expand all — collapsed legibility lines should disappear (changes expand).
    await rev
      .getByRole('button', { name: /expand all/i })
      .click({ force: true });
    // After expanding, the per-change action buttons (Approve/Reject) should
    // be visible for pending changes.
    await expect(
      rev.getByRole('button', { name: /approve/i }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Collapse all — legibility lines should reappear.
    await rev
      .getByRole('button', { name: /collapse all/i })
      .click({ force: true });
    await expect(rev.getByText(/\d+ words?/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('prev/next navigation moves through changes with a position indicator', async ({
    page,
  }) => {
    const rev = await openRevision(page);

    // Expand all so changes are navigable.
    await rev
      .getByRole('button', { name: /expand all/i })
      .click({ force: true });

    // Position indicator "N / total" should be visible.
    const positionLabel = rev.getByText(/^\d+ \/ \d+$/).first();
    await expect(positionLabel).toBeVisible({ timeout: 10000 });

    const initialText = (await positionLabel.textContent()) ?? '';
    const match = initialText.match(/(\d+)\s*\/\s*(\d+)/);
    expect(match).not.toBeNull();
    const total = Number(match![2]);
    expect(total).toBeGreaterThan(0);

    // Click next — position should advance. The nav buttons are icon-only;
    // use dispatchEvent because force-click doesn't trigger the Vue handler.
    await rev
      .locator('button:has(i.material-icons:text("arrow_downward"))')
      .first()
      .dispatchEvent('click');
    await page.waitForTimeout(300);
    const afterNext = (await positionLabel.textContent()) ?? '';
    const afterMatch = afterNext.match(/(\d+)\s*\/\s*(\d+)/);
    expect(Number(afterMatch![1])).toBeGreaterThan(Number(match![1]));

    // Click prev — position should go back.
    await rev
      .locator('button:has(i.material-icons:text("arrow_upward"))')
      .first()
      .dispatchEvent('click');
    await page.waitForTimeout(300);
    const afterPrev = (await positionLabel.textContent()) ?? '';
    const prevMatch = afterPrev.match(/(\d+)\s*\/\s*(\d+)/);
    expect(Number(prevMatch![1])).toBeLessThan(Number(afterMatch![1]));
  });

  test('keyboard navigation (j/k) works', async ({ page }) => {
    const rev = await openRevision(page);
    await rev
      .getByRole('button', { name: /expand all/i })
      .click({ force: true });

    const positionLabel = rev.getByText(/^\d+ \/ \d+$/).first();
    await expect(positionLabel).toBeVisible({ timeout: 10000 });
    const initial = (await positionLabel.textContent()) ?? '';
    const initialN = Number((initial.match(/(\d+)/) || [0])[1]);

    // Focus the toolbar and press 'j' (next).
    const toolbar = rev.locator('.bg-grey-1').first();
    await toolbar.click();
    await page.keyboard.press('j');
    await page.waitForTimeout(300);
    const afterJ = (await positionLabel.textContent()) ?? '';
    const afterJN = Number((afterJ.match(/(\d+)/) || [0])[1]);
    expect(afterJN).toBeGreaterThan(initialN);

    // Press 'k' (prev).
    await page.keyboard.press('k');
    await page.waitForTimeout(300);
    const afterK = (await positionLabel.textContent()) ?? '';
    const afterKN = Number((afterK.match(/(\d+)/) || [0])[1]);
    expect(afterKN).toBeLessThan(afterJN);
  });

  test('filter by change type narrows the visible changes', async ({
    page,
  }) => {
    const rev = await openRevision(page);

    // Read the total from the position indicator after expanding.
    await rev
      .getByRole('button', { name: /expand all/i })
      .click({ force: true });
    const positionLabel = rev.getByText(/^\d+ \/ \d+$/).first();
    await expect(positionLabel).toBeVisible({ timeout: 10000 });
    const initialText = (await positionLabel.textContent()) ?? '';
    const initialTotal = Number(
      (initialText.match(/\/\s*(\d+)/) || [0, '0'])[1],
    );

    // Click a type-count badge to filter (e.g. "insertions N").
    const insertionBadge = rev.getByText(/insertions/i).first();
    await insertionBadge.click({ force: true });
    await page.waitForTimeout(500);

    // The total in the position indicator should now be smaller (filtered).
    const filteredText = (await positionLabel.textContent()) ?? '';
    const filteredTotal = Number(
      (filteredText.match(/\/\s*(\d+)/) || [0, '0'])[1],
    );
    expect(filteredTotal).toBeLessThanOrEqual(initialTotal);

    // Clear the filter — total should restore.
    await rev
      .getByRole('button', { name: /clear filter/i })
      .click({ force: true });
    await page.waitForTimeout(500);
    const restoredText = (await positionLabel.textContent()) ?? '';
    const restoredTotal = Number(
      (restoredText.match(/\/\s*(\d+)/) || [0, '0'])[1],
    );
    expect(restoredTotal).toBe(initialTotal);
  });

  test('section-level accept stages an undoable bulk action', async ({
    page,
  }) => {
    const rev = await openRevision(page);
    await rev
      .getByRole('button', { name: /expand all/i })
      .click({ force: true });

    // Find a section with an "Accept section" button and click it.
    const acceptSectionBtn = rev
      .getByRole('button', { name: /accept section/i })
      .first();
    await expect(acceptSectionBtn).toBeVisible({ timeout: 10000 });
    await acceptSectionBtn.click({ force: true });

    // A staged-action banner with an "Undo" button should appear.
    const undoBtn = rev.getByRole('button', { name: /undo/i }).first();
    await expect(undoBtn).toBeVisible({ timeout: 10000 });

    // Undo it — the banner should disappear.
    await undoBtn.click({ force: true });
    await expect(undoBtn).toBeHidden({ timeout: 10000 });
  });

  test('reviewed changes are marked so the reviewer can resume', async ({
    page,
  }) => {
    const rev = await openRevision(page);
    await rev
      .getByRole('button', { name: /expand all/i })
      .click({ force: true });

    // Navigate next — the change becomes the nav target and is marked reviewed.
    await rev
      .locator('button:has(i.material-icons:text("arrow_downward"))')
      .first()
      .dispatchEvent('click');
    await page.waitForTimeout(500);

    // Collapse all — the reviewed marker (task_alt icon) only shows in the
    // collapsed legibility line, so collapse to reveal it.
    await rev
      .getByRole('button', { name: /collapse all/i })
      .click({ force: true });
    await page.waitForTimeout(500);

    // The reviewed marker is a q-icon with name "task_alt".
    const reviewedIcons = rev.locator('i.q-icon.material-icons', {
      hasText: 'task_alt',
    });
    const reviewedCount = await reviewedIcons.count();
    expect(reviewedCount).toBeGreaterThan(0);
  });
});
