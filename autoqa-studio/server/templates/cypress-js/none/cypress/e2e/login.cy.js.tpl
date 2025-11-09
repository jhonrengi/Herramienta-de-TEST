import locators from '../fixtures/locators.json';

const selector = key => locators[key].css || locators[key].xpath;

describe('Login sin patrón', () => {
  it('permite autenticación básica', () => {
    cy.visit('/login');
    cy.get(selector('input_email')).type('user@example.com');
    cy.get(selector('input_password')).type('secret');
    cy.get(selector('btn_login')).click();
    cy.url().should('include', 'dashboard');
  });
});
