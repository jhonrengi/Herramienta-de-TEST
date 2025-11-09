import { defineTask } from '../core/task';
import { LoginForm } from '../ui/loginForm';

export const Login = {
  with(credentials) {
    return defineTask('autentica al usuario con credenciales válidas', () => {
      const form = new LoginForm();
      form.fillEmail(credentials.email);
      form.fillPassword(credentials.password);
      form.submit();
    });
  }
};
