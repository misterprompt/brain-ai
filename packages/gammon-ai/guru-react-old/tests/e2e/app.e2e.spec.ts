import { test, expect } from '@playwright/test';

// Scénario E2E minimal : charger l'app, lancer les dés, tenter un coup local

test('basic local play flow', async ({ page }) => {
  await page.goto('/');

  // L'en-tête GuruGammon doit être visible
  await expect(page.getByText('GuruGammon')).toBeVisible();

  const rollButton = page.getByRole('button', { name: /Roll Dice/i });
  await expect(rollButton).toBeVisible();

  await rollButton.click();

  // Après le lancer, le texte du bouton doit afficher les valeurs de dés
  await expect(rollButton).toHaveText(/Dice:/i, { timeout: 2000 });

  // Tenter une interaction simple avec le plateau : cliquer sur un point
  const points = page.locator('.point');
  const count = await points.count();
  if (count > 0) {
    await points.first().click();
  }
});
