import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

const credentials = {
  email: 'user@example.com',
  password: 'secret'
};

test.describe('Autenticación', () => {
  test('permite iniciar sesión con credenciales válidas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto('/login');
    await loginPage.fillCredentials(credentials.email, credentials.password);
    await loginPage.submit();
    await expect(page).toHaveURL(/dashboard/);
  });
});
