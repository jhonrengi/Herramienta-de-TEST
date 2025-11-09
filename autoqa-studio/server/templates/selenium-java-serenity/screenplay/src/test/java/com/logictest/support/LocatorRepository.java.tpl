package com.logictest.support;

import com.fasterxml.jackson.databind.ObjectMapper;
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

    public static By by(String key) {
        Map<String, String> locator = LOCATORS.get(key);
        if (locator == null) {
            throw new IllegalArgumentException("Locator no encontrado: " + key);
        }
        if (locator.get("css") != null && !locator.get("css").isEmpty()) {
            return By.cssSelector(locator.get("css"));
        }
        return By.xpath(locator.get("xpath"));
    }

    public static String css(String key) {
        Map<String, String> locator = LOCATORS.get(key);
        return locator.getOrDefault("css", locator.getOrDefault("xpath", ""));
    }
}
