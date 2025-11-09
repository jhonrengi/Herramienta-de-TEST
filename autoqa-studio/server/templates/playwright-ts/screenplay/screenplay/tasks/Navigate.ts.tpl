import type { Page } from '@playwright/test';
import type { Actor, Task } from '../actors/Actor';

const page = (actor: Actor): Page => actor.ability('page');

export const Navigate = {
  to: (path: string): Task => async actor => {
    await page(actor).goto(path);
  }
};
