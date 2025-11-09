package com.logictest.tests;

import com.logictest.pages.LoginPage;
import net.serenitybdd.junit5.SerenityTest;
import net.serenitybdd.annotations.Managed;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebDriver;

@SerenityTest
class LoginTest {

    @Managed
    WebDriver driver;

    LoginPage loginPage;

    @BeforeEach
    void prepare() {
        loginPage = new LoginPage(driver);
    }

    @Test
    void user_can_login() {
        loginPage.openLogin();
        loginPage.fillCredentials("user@example.com", "secret");
        loginPage.submit();
    }
}
