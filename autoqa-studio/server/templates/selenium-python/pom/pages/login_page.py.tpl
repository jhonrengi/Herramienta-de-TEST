from __future__ import annotations

import json
from pathlib import Path
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

LOCATORS_PATH = Path(__file__).parent.parent / 'locators.json'


def _read_locators() -> dict[str, dict[str, str]]:
    return json.loads(LOCATORS_PATH.read_text())


class LoginPage:
    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.locators = _read_locators()

    def open(self):
        self.driver.get('http://localhost:3000/login')

    def _selector(self, key: str) -> tuple[str, str]:
        locator = self.locators[key]
        if locator.get('css'):
            return By.CSS_SELECTOR, locator['css']
        return By.XPATH, locator['xpath']

    def fill_credentials(self, email: str, password: str) -> None:
        by, value = self._selector('input_email')
        self.driver.find_element(by, value).send_keys(email)
        by, value = self._selector('input_password')
        self.driver.find_element(by, value).send_keys(password)

    def submit(self) -> None:
        by, value = self._selector('btn_login')
        self.driver.find_element(by, value).click()
