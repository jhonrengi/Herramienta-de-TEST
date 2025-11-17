# AutoQA Studio (Demo MVP)

Plataforma experimental para convertir escenarios funcionales en suites automatizadas. El repositorio contiene dos apps:

- **`server/`**: API Express que sirve templates, integra modelos de lenguaje y genera artefactos de prueba.
- **`web/`**: cliente Vite + React con asistentes para describir pruebas manualmente o con IA.

## Requisitos

- Node.js 18+ y npm 9+.
- (Opcional) Un proveedor de LLM disponible (OpenAI u Ollama local).

## Instalación

Ejecuta las dependencias desde la raíz y desde cada paquete:

```bash
npm install           # instala "concurrently" para los scripts globales
cd server && npm install
cd ../web && npm install
```

## Scripts disponibles

En la raíz (`autoqa-studio/`) se añadió un `package.json` con atajos:

```bash
npm run dev:server   # arranca el backend en el puerto 8787
npm run dev:web      # levanta Vite en el puerto 5173
npm run start:all    # lanza ambos procesos en paralelo
```

Los mismos comandos funcionan en PowerShell:

```powershell
npm run dev:server
npm run dev:web
npm run start:all
```

Si prefieres no usar los scripts raíz, ejecuta manualmente:

```bash
cd server && npm run dev
cd web && npm run dev
```

En PowerShell es equivalente:

```powershell
cd server; npm run dev
cd web; npm run dev
```

## Variables de entorno opcionales

Crea un archivo `server/.env` (o variables de entorno del sistema) para habilitar modelos de lenguaje. Todas son opcionales:

```
LLM_PROVIDER=none|openai|ollama
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434
```

- Establece `LLM_PROVIDER=none` para ejecutar solo heurísticas locales.
- Con `openai`, se usa `OPENAI_API_KEY`.
- Con `ollama`, apunta a la instancia local mediante `OLLAMA_BASE_URL`.

Sin variables, el backend cae automáticamente en modo "solo plantillas".

## IA asistida

### Botón **Analizar (IA)**
1. Describe tu caso de negocio en lenguaje natural dentro del panel de requisitos.
2. Haz clic en **Analizar (IA)**. El servidor consulta el proveedor configurado (o heurísticas internas) y genera:
   - Resumen del flujo.
   - Actores/sistemas detectados.
   - Posibles riesgos.
3. Ajusta el texto sugerido y guarda.

### De texto a Gherkin
1. Selecciona **Añadir escenario** y escribe pasos en español o inglés.
2. Usa **Analizar (IA)** dentro del modal para convertir la descripción en pasos Gherkin (Given/When/Then). El editor muestra la propuesta y permite editarla antes de guardar.

### De Gherkin a código
1. Elige la plantilla (framework y patrón) desde la sección **Codegen**.
2. Proporciona los localizadores detectados o importados.
3. Usa **Generar código desde Gherkin** para obtener una vista previa (_dry-run_) de los archivos que producirá la plantilla sin escribir en disco.
4. Cuando estés conforme, pulsa **Exportar ZIP listo para ejecutar**. El backend llama a `POST /api/gherkin2code/export`, renderiza la plantilla completa y devuelve un `.zip` comprimido más la carpeta física bajo `generated/<nombre>-<timestamp>` para poder descargar o compartir la automatización.

### Fallback chain y self-healing
- Si el modelo remoto falla o `LLM_PROVIDER=none`, la API usa una cadena de fallback: heurísticas → prompts comprimidos → respuestas cacheadas.
- El **runner** futuro reusará este historial para _self-healing_: ante fallos, propondrá nuevos localizadores y reintentará el flujo automáticamente antes de devolver el estado final.

## Solución de problemas (Windows)

| Problema | Acción recomendada |
| --- | --- |
| **`EPERM: operation not permitted, unlink ...esbuild.exe`** | Cierra PowerShells que tengan Vite abierto. Luego ejecuta `taskkill /IM esbuild.exe /F` y `npm rebuild esbuild` dentro de `web/`. Si persiste, elimina `web/node_modules/esbuild` con `Remove-Item -Recurse -Force`. |
| **Puertos 8787 o 5173 en uso** | Localiza el proceso con `netstat -ano | findstr :8787` (o :5173) y termina el PID usando `Stop-Process -Id <PID> -Force`. Después reintenta `npm run start:all`. |
| **npm usa un registry corporativo** | Cambia temporalmente con `npm config set registry https://registry.npmjs.org/` y repite la instalación. |
| **Antivirus elimina `esbuild.exe` o binarios de Playwright** | Añade `autoqa-studio/` a la lista de exclusiones o ejecuta PowerShell como administrador para permitir la creación de archivos. |

## Arquitectura mínima

1. **UI** (Vite) comunica cada acción vía `fetch` al backend (`http://localhost:8787/api/...`).
2. **Backend** responde con plantillas, IA, extracción de localizadores y generación de proyectos. Los resultados se guardan bajo `generated/` para su descarga.
3. **Runner (próxima iteración)** consumirá los proyectos generados y aplicará _self-healing_ antes de reportar.

> Todos los mensajes y comandos del proyecto se mantienen en español para facilitar talleres con equipos QA latinoamericanos.
