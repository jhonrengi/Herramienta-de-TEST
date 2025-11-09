from __future__ import annotations

from ..core.task import define_task
from ..ui.login_page import LoginPage


def navigate_to_login():
    return define_task(
        "navega a la pantalla de login",
        lambda actor: LoginPage(actor.ability('browser').driver).open()
    )
