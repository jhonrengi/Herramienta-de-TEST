import locators from '../fixtures/locators.json';

export class LoginPage {
  visit() {
    cy.visit('/login');
  }

  fillCredentials(email, password) {
    cy.get(locators.input_email.css || locators.input_email.xpath).type(email);
    cy.get(locators.input_password.css || locators.input_password.xpath).type(password);
  }

  submit() {
    cy.get(locators.btn_login.css || locators.btn_login.xpath).click();
  }
}
