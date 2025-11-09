import json
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By

LOCATORS = json.loads((Path(__file__).resolve().parent.parent / 'locators.json').read_text())


def _selector(key: str):
    locator = LOCATORS[key]
    if locator.get('css'):
        return By.CSS_SELECTOR, locator['css']
    return By.XPATH, locator['xpath']


@pytest.fixture
def driver():
    driver = webdriver.Chrome()
    driver.implicitly_wait(5)
    yield driver
    driver.quit()


def test_login_plain(driver):
    driver.get('http://localhost:3000/login')
    by, value = _selector('input_email')
    driver.find_element(by, value).send_keys('user@example.com')
    by, value = _selector('input_password')
    driver.find_element(by, value).send_keys('secret')
    by, value = _selector('btn_login')
    driver.find_element(by, value).click()
