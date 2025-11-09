import { test, expect } from '@playwright/test';
import selectors from '../locators.json';

const credentials = {
  email: 'user@example.com',
  password: 'secret'
};

test('login directo sin patrón', async ({ page }) => {
  await page.goto('/login');
  await page.fill(selectors.input_email.css ?? selectors.input_email.xpath, credentials.email);
  await page.fill(selectors.input_password.css ?? selectors.input_password.xpath, credentials.password);
  await page.click(selectors.btn_login.css ?? selectors.btn_login.xpath);
  await expect(page).toHaveURL(/dashboard/);
});
