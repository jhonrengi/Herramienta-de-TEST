import { Page } from '@playwright/test';
import selectors from '../locators.json';
import { getLocator } from '../utils/locator';

type LocatorKey = keyof typeof selectors;

export class LoginPage {
  constructor(private readonly page: Page) {}

  private candidate(name: LocatorKey) {
    return selectors[name];
  }

  async fillCredentials(email: string, password: string) {
    const emailField = await getLocator(this.page, this.candidate('input_email'));
    await emailField.fill(email);

    const passwordField = await getLocator(this.page, this.candidate('input_password'));
    await passwordField.fill(password);
  }

  async submit() {
    const loginButton = await getLocator(this.page, this.candidate('btn_login'));
    await loginButton.click();
  }
}
