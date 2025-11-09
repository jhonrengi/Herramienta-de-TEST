import type { Actor } from './Actor';

export interface Task {
  description?: string;
  performAs(actor: Actor): Promise<void>;
}
