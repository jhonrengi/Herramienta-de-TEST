import type { Page } from '@playwright/test';
import selectors from '../../locators.json';

type LocatorKey = keyof typeof selectors;

export class LoginForm {
  constructor(private readonly page: Page) {}

  private locator(key: LocatorKey) {
    const locator = selectors[key];
    if (locator.css) {
      return this.page.locator(locator.css);
    }
    return this.page.locator(`xpath=${locator.xpath}`);
  }

  async open(url: string) {
    await this.page.goto(url);
  }

  async enterEmail(email: string) {
    await this.locator('input_email').fill(email);
  }

  async enterPassword(password: string) {
    await this.locator('input_password').fill(password);
  }

  async submit() {
    await this.locator('btn_login').click();
  }
}
