import { test, expect } from '@playwright/test';
import selectors from '../locators.json';
import { getLocator } from '../utils/locator';

const credentials = {
  email: 'user@example.com',
  password: 'secret'
};

test('login directo sin patrón', async ({ page }) => {
  await page.goto('/login');
  const emailField = await getLocator(page, selectors.input_email);
  await emailField.fill(credentials.email);

  const passwordField = await getLocator(page, selectors.input_password);
  await passwordField.fill(credentials.password);

  const loginButton = await getLocator(page, selectors.btn_login);
  await loginButton.click();
  await expect(page).toHaveURL(/dashboard/);
});
