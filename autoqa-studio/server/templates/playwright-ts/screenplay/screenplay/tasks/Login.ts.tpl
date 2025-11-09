import selectors from '../../locators.json';
import type { Actor, Task } from '../actors/Actor';
import type { Page } from '@playwright/test';

const page = (actor: Actor): Page => actor.ability('page');

export const Login = {
  withCredentials: (email: string, password: string): Task => async actor => {
    const currentPage = page(actor);
    await currentPage.fill(selectors.input_email.css ?? selectors.input_email.xpath, email);
    await currentPage.fill(selectors.input_password.css ?? selectors.input_password.xpath, password);
    await currentPage.click(selectors.btn_login.css ?? selectors.btn_login.xpath);
  }
};
