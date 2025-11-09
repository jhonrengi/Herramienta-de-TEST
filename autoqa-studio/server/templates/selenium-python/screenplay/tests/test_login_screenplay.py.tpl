import pytest
from selenium import webdriver

from screenplay.actors.actor import Actor
from screenplay.tasks.navigate import navigate_to
from screenplay.tasks.login import login_with

@pytest.fixture
def driver():
    driver = webdriver.Chrome()
    driver.implicitly_wait(5)
    yield driver
    driver.quit()


def test_login_flow(driver):
    actor = Actor('QA', {'driver': driver})
    actor.perform(
        navigate_to('/login'),
        login_with('user@example.com', 'secret')
    )
