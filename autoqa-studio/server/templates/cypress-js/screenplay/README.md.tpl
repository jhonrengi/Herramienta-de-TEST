# {{projectName}}

Proyecto generado con LogicTest para **{{frameworkName}}** usando el patrón **{{patternName}}**.

## Estructura Screenplay

```
├── cypress
│   ├── e2e                     # Historias de usuario
│   ├── fixtures/locators.json  # Localizadores descubiertos por LogicTest
│   └── support/screenplay
│       ├── core                # Actor + contrato de tareas
│       ├── support             # Datos compartidos, credenciales de ejemplo
│       ├── tasks               # Acciones reutilizables
│       └── ui                  # Componentes que encapsulan widgets
```

Cada tarea se construye con `defineTask` y se ejecuta a través de `actor.attemptsTo(...)` para mantener escenarios declarativos.

> **Nota:** si deseas usar localizadores XPath instala el plugin [`@cypress/xpath`](https://github.com/cypress-io/cypress-xpath).

## Ejecutar pruebas

```bash
npm install
npx cypress run
```

## Localizadores disponibles

{{locatorSummary}}
