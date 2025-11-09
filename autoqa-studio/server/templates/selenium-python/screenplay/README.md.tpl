# {{projectName}}

Proyecto generado con LogicTest para **{{frameworkName}}** usando el patrón **{{patternName}}**.

## Estructura Screenplay

```
├── screenplay
│   ├── core         # Actor + contrato de tareas
│   ├── abilities    # Habilidades que encapsulan recursos (WebDriver)
│   ├── support      # Datos compartidos como credenciales
│   ├── tasks        # Acciones reutilizables
│   └── ui           # Page Objects livianos construidos desde locators.json
├── tests            # Escenarios de usuario con Pytest
└── locators.json    # Mapa de localizadores detectados por LogicTest
```

## Ejecutar pruebas

```bash
pip install -r requirements.txt
pytest
```

## Localizadores disponibles

{{locatorSummary}}
