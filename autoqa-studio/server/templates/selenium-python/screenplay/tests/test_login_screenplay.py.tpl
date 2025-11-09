from __future__ import annotations

import pytest
from selenium import webdriver

from screenplay.abilities.browser import browse_the_web
from screenplay.core.actor import Actor
from screenplay.support.credentials import Credentials
from screenplay.tasks.login import login_with
from screenplay.tasks.navigate import navigate_to_login


@pytest.fixture
def actor():
    driver = webdriver.Chrome()
    actor = Actor.named('QA Analyst').who_can(browser=browse_the_web(driver))
    yield actor
    driver.quit()


def test_user_can_authenticate(actor):
    actor.attempts_to(
        navigate_to_login(),
        login_with(Credentials.demo_user())
    )

    assert '/dashboard' in actor.ability('browser').driver.current_url
