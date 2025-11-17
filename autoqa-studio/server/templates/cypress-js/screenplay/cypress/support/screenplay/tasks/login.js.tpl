import locators from '../../../fixtures/locators.json';

export const Login = {
  withCredentials: (email, password) => actor => {
    const page = actor.ability('page');
    page.locate(locators.input_email).type(email);
    page.locate(locators.input_password).type(password);
    page.locate(locators.btn_login).click();
  }
};
