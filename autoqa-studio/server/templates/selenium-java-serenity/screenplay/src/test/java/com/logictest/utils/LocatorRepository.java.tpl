package com.logictest.utils;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.serenitybdd.screenplay.targets.Target;
import org.openqa.selenium.By;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class LocatorRepository {
    private static final Map<String, Map<String, Object>> LOCATORS = load();

    private static Map<String, Map<String, Object>> load() {
        try {
            byte[] data = Files.readAllBytes(Paths.get("src/test/resources/locators.json"));
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(data, new TypeReference<Map<String, Map<String, Object>>>() {});
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo cargar locators.json", e);
        }
    }

    private static Map<String, Object> locatorFor(String key) {
        Map<String, Object> locator = LOCATORS.get(key);
        if (locator == null) {
            throw new IllegalArgumentException("Locator no encontrado: " + key);
        }
        return locator;
    }

    private static String asString(Object value) {
        if (value instanceof String string && !string.isBlank()) {
            return string;
        }
        return "";
    }

    private static List<String> fallbacks(Map<String, Object> locator) {
        Object raw = locator.get("fallbacks");
        if (raw instanceof List<?> list) {
            List<String> values = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof String str && !str.isBlank()) {
                    values.add(str);
                }
            }
            return values;
        }
        return Collections.emptyList();
    }

    private static By fromGenericSelector(String selector) {
        if (selector.startsWith("text=")) {
            String text = selector.substring(5);
            String xpath = String.format("//*[normalize-space(text())='%s']", text);
            return By.xpath(xpath);
        }
        if (selector.startsWith("//") || selector.startsWith("(")) {
            return By.xpath(selector);
        }
        return By.cssSelector(selector);
    }

    public static By by(String key) {
        Map<String, Object> locator = locatorFor(key);
        String css = asString(locator.get("css"));
        if (!css.isEmpty()) {
            return By.cssSelector(css);
        }
        String xpath = asString(locator.get("xpath"));
        if (!xpath.isEmpty()) {
            return By.xpath(xpath);
        }
        for (String fallback : fallbacks(locator)) {
            return fromGenericSelector(fallback);
        }
        throw new IllegalArgumentException("No hay selectores configurados para: " + key);
    }

    public static Target target(String key, String description) {
        return Target.the(description).located(by(key));
    }

    public static String css(String key) {
        Map<String, Object> locator = locatorFor(key);
        String css = asString(locator.get("css"));
        if (!css.isEmpty()) {
            return css;
        }
        String xpath = asString(locator.get("xpath"));
        if (!xpath.isEmpty()) {
            return xpath;
        }
        for (String fallback : fallbacks(locator)) {
            if (!fallback.isBlank()) {
                return fallback;
            }
        }
        return "";
    }
}
