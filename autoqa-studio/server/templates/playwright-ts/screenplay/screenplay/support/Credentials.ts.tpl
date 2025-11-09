export interface LoginCredentials {
  email: string;
  password: string;
}

export const Credentials = {
  demoUser(): LoginCredentials {
    return {
      email: 'qa.tester@example.com',
      password: 'SuperSecret123!'
    };
  }
};
