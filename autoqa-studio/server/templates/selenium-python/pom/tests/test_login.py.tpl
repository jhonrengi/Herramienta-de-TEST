import pytest
from selenium import webdriver

from pages.login_page import LoginPage

@pytest.fixture
def driver():
    driver = webdriver.Chrome()
    driver.implicitly_wait(5)
    yield driver
    driver.quit()


def test_user_can_login(driver):
    login_page = LoginPage(driver)
    login_page.open()
    login_page.fill_credentials('user@example.com', 'secret')
    login_page.submit()
