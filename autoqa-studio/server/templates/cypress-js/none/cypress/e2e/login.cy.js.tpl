import locators from '../fixtures/locators.json';
import { getByChain } from '../support/locator';

describe('Login sin patrón', () => {
  it('permite autenticación básica', () => {
    cy.visit('/login');
    getByChain(locators.input_email).type('user@example.com');
    getByChain(locators.input_password).type('secret');
    getByChain(locators.btn_login).click();
    cy.url().should('include', 'dashboard');
  });
});
