import { test, expect } from '@playwright/test';

test('Basic Game Load Test', async ({ page }) => {
  await page.goto('http://localhost:4173');
  await expect(page.locator('button:has-text("Play vs AI")')).toBeVisible();
});
