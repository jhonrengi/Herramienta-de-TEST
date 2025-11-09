import locators from '../../../fixtures/locators.json';

const selector = name => locators[name].css || locators[name].xpath;

export const Login = {
  withCredentials: (email, password) => async actor => {
    const page = actor.ability('page');
    page.get(selector('input_email')).type(email);
    page.get(selector('input_password')).type(password);
    page.get(selector('btn_login')).click();
  }
};
