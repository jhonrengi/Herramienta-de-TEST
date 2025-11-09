package com.logictest.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.serenitybdd.screenplay.targets.Target;
import org.openqa.selenium.By;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;

public final class LocatorRepository {
    private record LocatorDefinition(String css, String xpath) {
        Target asTarget(String description) {
            if (css != null && !css.isBlank()) {
                return Target.the(description).located(By.cssSelector(css));
            }
            return Target.the(description).located(By.xpath(xpath));
        }
    }

    private static final Map<String, LocatorDefinition> LOCATORS = load();

    private LocatorRepository() {}

    private static Map<String, LocatorDefinition> load() {
        try {
            byte[] data = Files.readAllBytes(Paths.get("src/test/resources/locators.json"));
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(data, new TypeReference<>() {});
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo cargar locators.json", e);
        }
    }

    public static Target target(String key, String description) {
        LocatorDefinition locator = LOCATORS.get(key);
        if (locator == null) {
            throw new IllegalArgumentException("Locator no encontrado: " + key);
        }
        return locator.asTarget(description);
    }
}
