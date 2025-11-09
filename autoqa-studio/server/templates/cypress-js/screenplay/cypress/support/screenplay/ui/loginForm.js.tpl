import locators from '../../fixtures/locators.json';

const query = key => {
  const locator = locators[key];
  if (!locator) {
    throw new Error(`Locator no definido: ${key}`);
  }
  if (locator.css) {
    return cy.get(locator.css);
  }
  if (typeof cy.xpath === 'function') {
    return cy.xpath(locator.xpath);
  }
  throw new Error(
    `El localizador ${key} requiere XPath. Agrega el plugin @cypress/xpath para habilitarlo.`
  );
};

export class LoginForm {
  open(url) {
    cy.visit(url);
  }

  fillEmail(email) {
    query('input_email').clear().type(email);
  }

  fillPassword(password) {
    query('input_password').clear().type(password, { log: false });
  }

  submit() {
    query('btn_login').click();
  }
}
