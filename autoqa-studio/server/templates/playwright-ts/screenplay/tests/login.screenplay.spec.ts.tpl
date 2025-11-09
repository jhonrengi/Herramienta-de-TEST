import { test, expect } from '@playwright/test';
import { Actor } from '../screenplay/core/Actor';
import { Navigate } from '../screenplay/tasks/Navigate';
import { LogIn } from '../screenplay/tasks/Login';
import { Credentials } from '../screenplay/support/Credentials';

const LOGIN_URL = 'https://demo.logictest.io/login';

test.describe('Historias de autenticación', () => {
  test('el actor puede autenticarse', async ({ page }) => {
    const actor = Actor.withBrowser('QA Analyst', page);

    await actor.attemptsTo(
      Navigate.toLogin(LOGIN_URL),
      LogIn.with(Credentials.demoUser())
    );

    await expect(page).toHaveURL(/dashboard/);
  });
});
