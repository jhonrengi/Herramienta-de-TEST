# {{projectName}}

Proyecto generado con LogicTest para **{{frameworkName}}** usando el patrón **{{patternName}}**.

## Estructura Screenplay

```
├── src/test/java/com/logictest
│   ├── features         # Historias escritas con Screenplay + JUnit 5
│   ├── model            # Datos compartidos (credentials)
│   ├── tasks            # NavigateTo + Authenticate
│   ├── ui               # Targets que representan la UI
│   └── support          # Repositorio de localizadores dinámicos
├── src/test/resources   # locators.json generado por LogicTest
└── serenity.properties  # Configuración base del runner
```

## Ejecutar pruebas

```bash
mvn verify
```

## Localizadores disponibles

{{locatorSummary}}
