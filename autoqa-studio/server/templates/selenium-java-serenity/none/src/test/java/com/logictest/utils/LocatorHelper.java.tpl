package com.logictest.utils;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.openqa.selenium.By;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.SearchContext;
import org.openqa.selenium.WebElement;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class LocatorHelper {
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

    private static List<String> chain(Map<String, Object> locator) {
        List<String> selectors = new ArrayList<>();
        Object css = locator.get("css");
        if (css instanceof String && !((String) css).isBlank()) {
            selectors.add("css:" + css);
        }
        Object xpath = locator.get("xpath");
        if (xpath instanceof String && !((String) xpath).isBlank()) {
            selectors.add("xpath:" + xpath);
        }
        Object fallbacks = locator.get("fallbacks");
        if (fallbacks instanceof List<?>) {
            for (Object fallback : (List<?>) fallbacks) {
                if (fallback instanceof String && !((String) fallback).isBlank()) {
                    selectors.add((String) fallback);
                }
            }
        }
        return selectors;
    }

    private static By fromSelector(String selector) {
        if (selector.startsWith("css:")) {
            return By.cssSelector(selector.substring(4));
        }
        if (selector.startsWith("xpath:")) {
            return By.xpath(selector.substring(6));
        }
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

    public static WebElement find(SearchContext context, String key) {
        Map<String, Object> locator = locatorFor(key);
        List<String> selectors = chain(locator);
        for (String selector : selectors) {
            By by = fromSelector(selector);
            try {
                WebElement element = context.findElement(by);
                if (element != null) {
                    return element;
                }
            } catch (NoSuchElementException ignored) {
                // Intentar siguiente selector
            }
        }
        throw new NoSuchElementException("No se encontró un elemento para la clave: " + key);
    }

    public static By preferredBy(String key) {
        Map<String, Object> locator = locatorFor(key);
        Object css = locator.get("css");
        if (css instanceof String && !((String) css).isBlank()) {
            return By.cssSelector((String) css);
        }
        Object xpath = locator.get("xpath");
        if (xpath instanceof String && !((String) xpath).isBlank()) {
            return By.xpath((String) xpath);
        }
        Object fallbacks = locator.get("fallbacks");
        if (fallbacks instanceof List<?>) {
            for (Object fallback : (List<?>) fallbacks) {
                if (fallback instanceof String && !((String) fallback).isBlank()) {
                    return fromSelector((String) fallback);
                }
            }
        }
        throw new IllegalArgumentException("No hay selectores configurados para: " + key);
    }

    public static Map<String, Map<String, Object>> all() {
        return Collections.unmodifiableMap(LOCATORS);
    }
}
