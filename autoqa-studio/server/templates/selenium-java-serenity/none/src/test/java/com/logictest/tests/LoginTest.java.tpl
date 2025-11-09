package com.logictest.tests;

import com.fasterxml.jackson.databind.ObjectMapper;
import net.serenitybdd.annotations.Managed;
import net.serenitybdd.junit5.SerenityTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;

@SerenityTest
class LoginTest {

    @Managed
    WebDriver driver;

    Map<String, Map<String, String>> locators;

    @BeforeEach
    void loadLocators() throws IOException {
        byte[] data = Files.readAllBytes(Paths.get("src/test/resources/locators.json"));
        locators = new ObjectMapper().readValue(data, Map.class);
    }

    @Test
    void login_with_plain_selenium() {
        driver.get("http://localhost:3000/login");
        driver.findElement(by("input_email")).sendKeys("user@example.com");
        driver.findElement(by("input_password")).sendKeys("secret");
        driver.findElement(by("btn_login")).click();
    }

    private By by(String key) {
        Map<String, String> locator = locators.get(key);
        if (locator.get("css") != null && !locator.get("css").isEmpty()) {
            return By.cssSelector(locator.get("css"));
        }
        return By.xpath(locator.get("xpath"));
    }
}
