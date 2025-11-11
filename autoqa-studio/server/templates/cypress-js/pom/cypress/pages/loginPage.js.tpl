import locators from '../fixtures/locators.json';
import { getByChain } from '../support/locator';

export class LoginPage {
  visit() {
    cy.visit('/login');
  }

  fillCredentials(email, password) {
    getByChain(locators.input_email).type(email);
    getByChain(locators.input_password).type(password);
  }

  submit() {
    getByChain(locators.btn_login).click();
  }
}
