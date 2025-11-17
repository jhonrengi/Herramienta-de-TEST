package com.logictest.tests;

import com.logictest.utils.LocatorHelper;
import net.serenitybdd.annotations.Managed;
import net.serenitybdd.junit5.SerenityTest;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebDriver;

@SerenityTest
class LoginTest {

    @Managed
    WebDriver driver;

    @Test
    void login_with_plain_selenium() {
        driver.get("http://localhost:3000/login");
        LocatorHelper.find(driver, "input_email").sendKeys("user@example.com");
        LocatorHelper.find(driver, "input_password").sendKeys("secret");
        LocatorHelper.find(driver, "btn_login").click();
    }
}
