import json
from pathlib import Path
from selenium.webdriver.common.by import By

LOCATORS = json.loads((Path(__file__).resolve().parents[2] / 'locators.json').read_text())


def _selector(key: str) -> tuple[str, str]:
    locator = LOCATORS[key]
    if locator.get('css'):
        return By.CSS_SELECTOR, locator['css']
    return By.XPATH, locator['xpath']


def login_with(email: str, password: str):
    def task(actor):
        driver = actor.ability('driver')
        by, value = _selector('input_email')
        driver.find_element(by, value).send_keys(email)
        by, value = _selector('input_password')
        driver.find_element(by, value).send_keys(password)
        by, value = _selector('btn_login')
        driver.find_element(by, value).click()
    return task
