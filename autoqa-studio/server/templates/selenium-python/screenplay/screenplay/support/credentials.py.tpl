from dataclasses import dataclass


@dataclass(frozen=True)
class LoginCredentials:
    email: str
    password: str


class Credentials:
    @staticmethod
    def demo_user() -> LoginCredentials:
        return LoginCredentials(
            email="qa.tester@example.com",
            password="SuperSecret123!"
        )
