from __future__ import annotations

from ..core.task import define_task
from ..support.credentials import LoginCredentials
from ..ui.login_page import LoginPage


def login_with(credentials: LoginCredentials):
    def performer(actor):
        page = LoginPage(actor.ability('browser').driver)
        email = page.email_field()
        email.clear()
        email.send_keys(credentials.email)
        password = page.password_field()
        password.clear()
        password.send_keys(credentials.password)
        page.submit_button().click()

    return define_task('autentica al usuario con credenciales válidas', performer)
