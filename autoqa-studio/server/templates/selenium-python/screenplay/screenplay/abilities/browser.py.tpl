from dataclasses import dataclass
from selenium.webdriver.remote.webdriver import WebDriver


def browse_the_web(driver: WebDriver) -> "BrowseTheWeb":
    return BrowseTheWeb(driver)


@dataclass
class BrowseTheWeb:
    driver: WebDriver

    def open(self, url: str) -> None:
        self.driver.get(url)
