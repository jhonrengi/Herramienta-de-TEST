import type { Task } from '../core/Task';
import type { Actor } from '../core/Actor';

export class Navigate {
  static toLogin(url: string): Task {
    return {
      description: `navega a ${url}`,
      async performAs(actor: Actor) {
        await actor.page.goto(url);
      }
    };
  }
}
