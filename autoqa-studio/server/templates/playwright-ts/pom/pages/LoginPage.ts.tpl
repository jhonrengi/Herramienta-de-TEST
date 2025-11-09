import { Page } from '@playwright/test';
import selectors from '../locators.json';

type LocatorKey = keyof typeof selectors;

export class LoginPage {
  constructor(private readonly page: Page) {}

  private selector(name: LocatorKey): string {
    return selectors[name].css ?? selectors[name].xpath;
  }

  async fillCredentials(email: string, password: string) {
    await this.page.fill(this.selector('input_email'), email);
    await this.page.fill(this.selector('input_password'), password);
  }

  async submit() {
    await this.page.click(this.selector('btn_login'));
  }
}
