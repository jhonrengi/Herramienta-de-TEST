import type { Page } from '@playwright/test';
import type { Task } from './Task';

type Abilities = {
  page: Page;
};

export class Actor {
  private constructor(public readonly name: string, private readonly abilities: Abilities) {}

  static withBrowser(name: string, page: Page) {
    return new Actor(name, { page });
  }

  ability<T extends keyof Abilities>(name: T): Abilities[T] {
    return this.abilities[name];
  }

  get page(): Page {
    return this.abilities.page;
  }

  async attemptsTo(...tasks: Task[]) {
    for (const task of tasks) {
      await task.performAs(this);
    }
  }
}
