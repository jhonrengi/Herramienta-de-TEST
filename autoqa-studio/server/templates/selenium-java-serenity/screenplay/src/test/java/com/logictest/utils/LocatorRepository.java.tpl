package com.logictest.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import net.serenitybdd.screenplay.targets.Target;
import org.openqa.selenium.By;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;

public class LocatorRepository {
    private static final Map<String, Map<String, String>> LOCATORS = load();

    private static Map<String, Map<String, String>> load() {
        try {
            byte[] data = Files.readAllBytes(Paths.get("src/test/resources/locators.json"));
            return new ObjectMapper().readValue(data, Map.class);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo cargar locators.json", e);
        }
    }

    private static Map<String, String> locatorFor(String key) {
        Map<String, String> locator = LOCATORS.get(key);
        if (locator == null) {
            throw new IllegalArgumentException("Locator no encontrado: " + key);
        }
        return locator;
    }

    public static By by(String key) {
        Map<String, String> locator = locatorFor(key);
        if (locator.get("css") != null && !locator.get("css").isEmpty()) {
            return By.cssSelector(locator.get("css"));
        }
        return By.xpath(locator.get("xpath"));
    }

    public static Target target(String key, String description) {
        return Target.the(description).located(by(key));
    }

    public static String css(String key) {
        Map<String, String> locator = locatorFor(key);
        return locator.getOrDefault("css", locator.getOrDefault("xpath", ""));
    }
}
