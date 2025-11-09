import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('Login works', async ({ page }) => {
  const login = new LoginPage(page);
  await page.goto('/');
  await login.login('user@example.com', 'secret');
  await expect(page).toHaveURL(/dashboard/);
});
