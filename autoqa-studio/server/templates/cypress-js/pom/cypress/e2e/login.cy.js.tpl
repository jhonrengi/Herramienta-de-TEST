import { LoginPage } from '../pages/loginPage';

const loginPage = new LoginPage();

describe('Flujo de login', () => {
  it('permite acceder a usuarios válidos', () => {
    loginPage.visit();
    loginPage.fillCredentials('user@example.com', 'secret');
    loginPage.submit();
    cy.url().should('include', 'dashboard');
  });
});
