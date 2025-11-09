import { defineTask } from '../core/task';

export const Navigate = {
  toLogin(url) {
    return defineTask(`navega a ${url}`, () => {
      cy.visit(url);
    });
  }
};
