# {{projectName}}

Proyecto generado con LogicTest para **{{frameworkName}}** usando el patrón **{{patternName}}**.

## Estructura Screenplay

```
├── screenplay
│   ├── core          # Actor y contratos de tareas
│   ├── support       # Datos compartidos para los actores
│   ├── ui            # Componentes que encapsulan widgets de la interfaz
│   └── tasks         # Acciones reutilizables que los actores ejecutan
├── tests             # Historias de usuario
└── locators.json     # Mapa de localizadores detectados por LogicTest
```

Cada tarea implementa el contrato `Task` y se ejecuta a través de `actor.attemptsTo(...)` para mantener escenarios expresivos.

## Ejecutar pruebas

```bash
npm install
npx playwright install
npm test
```

## Localizadores disponibles

{{locatorSummary}}
