import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/auth-helper';

test.describe('Provider Received Direct Tasks UI', () => {
  const PROVIDER_EMAIL = 'pw-provider@e2e.com';
  const PASSWORD = 'password123';
  const FRONTEND_URL = process.env.PLAYWRIGHT_FRONTEND_URL ?? 'http://localhost:3000';

  test.beforeEach(async ({ context, page, request }) => {
    const { accessToken } = await loginUser(request, PROVIDER_EMAIL, PASSWORD);

    await context.addCookies([
      {
        name: 'accessToken',
        value: accessToken,
        url: FRONTEND_URL,
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${FRONTEND_URL}/dashboard`);
    await expect(page.getByText(/Welcome back,/).first()).toBeVisible({ timeout: 15000 });
  });

  test('Verify Pending Direct Tasks Banner appears and links correctly', async ({ page }) => {
    // The banner should be visible on the home dashboard since we seeded PENDING tasks
    const bannerHeading = page.locator('h3:has-text("Direct Task")').first();
    await expect(bannerHeading).toBeVisible();

    // Click on the banner's "Review Requests" CTA
    await page.click('a:has-text("Review Requests")');

    // Should navigate to jobs page with the direct-tasks tab active
    await expect(page).toHaveURL(/\/dashboard\/jobs\?tab=direct-tasks/);

    // Verify "Received Direct Tasks" table header is visible
    await expect(page.locator('h2:has-text("Received Direct Tasks")')).toBeVisible();
  });

  test('Verify Jobs Page Tab Navigation', async ({ page }) => {
    // Go directly to the Jobs page
    await page.goto(`${FRONTEND_URL}/dashboard/jobs`);
    
    // Ensure we see the default Active Jobs tab content
    const activeJobsTab = page.locator('button', { hasText: 'Active Jobs & Deliveries' });
    await expect(activeJobsTab).toBeVisible();

    // Ensure the Received Direct Tasks tab has the red badge (if pending tasks > 0)
    const directTasksTab = page.locator('button', { hasText: 'Received Direct Tasks' });
    await expect(directTasksTab).toBeVisible();
    // Check for the numeric badge indicating pending requests (e.g. "2")
    await expect(directTasksTab.locator('span.bg-red-500')).toBeVisible();

    // Click the Received Direct Tasks tab
    await directTasksTab.click();

    // Verify URL updates with query param
    await expect(page).toHaveURL(/\/dashboard\/jobs\?tab=direct-tasks/);

    // Verify table loads correctly and displays our seeded data
    await expect(page.locator('h2:has-text("Received Direct Tasks")')).toBeVisible();
    
    // Wait for data to load
    await expect(page.locator('text=Pending SEO Link Insertion').first()).toBeVisible();
    await expect(page.locator('text=Accepted Niche Edit').first()).toBeVisible();
  });
});
