import type { Task } from '../core/Task';
import type { Actor } from '../core/Actor';
import { LoginForm } from '../ui/LoginForm';
import type { LoginCredentials } from '../support/Credentials';

export class LogIn {
  static with(credentials: LoginCredentials): Task {
    return {
      description: 'autentica al usuario con credenciales válidas',
      async performAs(actor: Actor) {
        const form = new LoginForm(actor.page);
        await form.enterEmail(credentials.email);
        await form.enterPassword(credentials.password);
        await form.submit();
      }
    };
  }
}
