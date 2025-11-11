import selectors from '../../locators.json';
import type { Actor, Task } from '../actors/Actor';
import type { Page } from '@playwright/test';
import { getLocator } from '../../utils/locator';

const page = (actor: Actor): Page => actor.ability('page');

export const Login = {
  withCredentials: (email: string, password: string): Task => async actor => {
    const currentPage = page(actor);
    const emailField = await getLocator(currentPage, selectors.input_email);
    await emailField.fill(email);

    const passwordField = await getLocator(currentPage, selectors.input_password);
    await passwordField.fill(password);

    const loginButton = await getLocator(currentPage, selectors.btn_login);
    await loginButton.click();
  }
};
