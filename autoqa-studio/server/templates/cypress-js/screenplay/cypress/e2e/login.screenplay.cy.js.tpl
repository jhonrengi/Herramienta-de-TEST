import { Actor } from '../support/screenplay/actors/actor';
import { Navigate } from '../support/screenplay/tasks/navigate';
import { Login } from '../support/screenplay/tasks/login';
import { getByChain } from '../support/locator';

const pageAbility = {
  visit: path => cy.visit(path),
  locate: candidate => getByChain(candidate)
};

describe('Historias de autenticación', () => {
  it('permite iniciar sesión usando Screenplay', () => {
    const actor = new Actor('QA', { page: pageAbility });
    return actor.attemptsTo(
      Navigate.to('/login'),
      Login.withCredentials('user@example.com', 'secret')
    );
  });
});
