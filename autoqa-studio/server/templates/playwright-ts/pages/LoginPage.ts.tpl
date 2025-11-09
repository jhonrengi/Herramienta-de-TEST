import { Page } from '@playwright/test';
import locators from '../locators.json';

export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill(locators.input_email.css, email);
    await this.page.fill(locators.input_password.css, password);
    await this.page.click(locators.btn_login.css);
  }
}
