package com.logictest.pages;

import net.serenitybdd.core.pages.PageObject;
import net.thucydides.core.annotations.DefaultUrl;
import org.openqa.selenium.WebDriver;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;

@DefaultUrl("/login")
public class LoginPage extends PageObject {

    private final Map<String, Map<String, String>> locators;

    public LoginPage(WebDriver driver) {
        super(driver);
        this.locators = loadLocators();
    }

    public void openLogin() {
        this.open();
    }

    public void fillCredentials(String email, String password) {
        $(css("input_email")).type(email);
        $(css("input_password")).type(password);
    }

    public void submit() {
        $(css("btn_login")).click();
    }

    private String css(String key) {
        return locators.get(key).getOrDefault("css", locators.get(key).getOrDefault("xpath", ""));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Map<String, String>> loadLocators() {
        try {
            byte[] data = Files.readAllBytes(Paths.get("src/test/resources/locators.json"));
            return new ObjectMapper().readValue(data, Map.class);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo cargar locators.json", e);
        }
    }
}
