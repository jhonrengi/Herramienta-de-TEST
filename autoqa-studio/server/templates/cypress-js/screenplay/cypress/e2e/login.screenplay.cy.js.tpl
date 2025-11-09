import { Actor } from '../support/screenplay/core/actor';
import { Navigate } from '../support/screenplay/tasks/navigate';
import { Login } from '../support/screenplay/tasks/login';
import { Credentials } from '../support/screenplay/support/credentials';

const LOGIN_URL = 'https://demo.logictest.io/login';

describe('Historias de autenticación', () => {
  it('permite iniciar sesión usando Screenplay', () => {
    const actor = Actor.named('QA Analyst');

    actor.attemptsTo(
      Navigate.toLogin(LOGIN_URL),
      Login.with(Credentials.demoUser())
    );

    cy.url().should('include', '/dashboard');
  });
});
