import { test, expect } from '@playwright/test';
import { Actor } from '../screenplay/actors/Actor';
import { Navigate } from '../screenplay/tasks/Navigate';
import { Login } from '../screenplay/tasks/Login';

const QA = { email: 'user@example.com', password: 'secret' };

test.describe('Historias de autenticación', () => {
  test('el actor puede autenticarse', async ({ page }) => {
    const actor = new Actor('QA Analyst', { page });
    await actor.attemptsTo(
      Navigate.to('/login'),
      Login.withCredentials(QA.email, QA.password)
    );

    await expect(page).toHaveURL(/dashboard/);
  });
});
