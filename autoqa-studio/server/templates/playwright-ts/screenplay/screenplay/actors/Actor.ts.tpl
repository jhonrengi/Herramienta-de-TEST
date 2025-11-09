import type { Page } from '@playwright/test';

export type Task = (actor: Actor) => Promise<void> | void;

type Abilities = {
  page: Page;
};

export class Actor {
  constructor(public readonly name: string, private readonly abilities: Abilities) {}

  ability<T extends keyof Abilities>(name: T): Abilities[T] {
    return this.abilities[name];
  }

  async attemptsTo(...tasks: Task[]) {
    for (const task of tasks) {
      await task(this);
    }
  }
}
