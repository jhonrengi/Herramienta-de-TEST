from __future__ import annotations

import json
from pathlib import Path
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

_LOCATORS = json.loads((Path(__file__).resolve().parents[2] / 'locators.json').read_text())


def _selector(key: str) -> tuple[str, str]:
    locator = _LOCATORS[key]
    if locator.get('css'):
        return By.CSS_SELECTOR, locator['css']
    return By.XPATH, locator['xpath']


class LoginPage:
    URL = 'https://demo.logictest.io/login'

    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def open(self) -> None:
        self._driver.get(self.URL)

    def email_field(self):
        by, value = _selector('input_email')
        return self._driver.find_element(by, value)

    def password_field(self):
        by, value = _selector('input_password')
        return self._driver.find_element(by, value)

    def submit_button(self):
        by, value = _selector('btn_login')
        return self._driver.find_element(by, value)
