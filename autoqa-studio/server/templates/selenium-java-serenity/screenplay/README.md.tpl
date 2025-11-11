# {{projectName}}

Proyecto generado con LogicTest usando **{{frameworkName}}** y el patrón **Screenplay**.

## Estructura principal

```
├── build.gradle
├── serenity.properties
├── src
│   └── test
│       ├── java
│       │   └── com
│       │       └── logictest
│       │           ├── model
│       │           ├── questions
│       │           ├── runners
│       │           ├── stepdefinitions
│       │           ├── tasks
│       │           ├── ui
│       │           └── utils
│       └── resources
│           ├── features
│           └── locators.json
```

## Ejecutar las pruebas

```bash
./gradlew test
```

Si no cuentas con el wrapper de Gradle puedes usar:

```bash
gradle test
```

## Localizadores generados

{{locatorSummary}}
