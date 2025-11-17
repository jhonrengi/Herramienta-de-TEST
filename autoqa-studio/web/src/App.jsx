import React, { useEffect, useMemo, useState } from 'react'
import './App.css'

const API = 'http://localhost:8787'

const statusCopy = {
  idle: 'Listo para empezar',
  recording: 'Extrayendo localizadores…',
  generating: 'Generando proyecto…',
  running: 'Ejecutando pruebas…'
}

export default function App() {
  const [templates, setTemplates] = useState({ frameworks: [], patterns: [] })
  const [locators, setLocators] = useState([])
  const [frameworkId, setFrameworkId] = useState('')
  const [patternId, setPatternId] = useState('')
  const [projectName, setProjectName] = useState('logictest-demo')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [generatedInfo, setGeneratedInfo] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [aiUrl, setAiUrl] = useState('http://localhost:3000/login')
  const [aiHtml, setAiHtml] = useState('')
  const [aiHtmlExpanded, setAiHtmlExpanded] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLocators, setAiLocators] = useState([])
  const [aiMeta, setAiMeta] = useState(null)
  const [aiError, setAiError] = useState('')
  const [aiSavedAt, setAiSavedAt] = useState(null)
  const [requirementText, setRequirementText] = useState('')
  const [gherkinFeature, setGherkinFeature] = useState('')
  const [gherkinScenarios, setGherkinScenarios] = useState('')
  const [gherkinSource, setGherkinSource] = useState('')
  const [nlError, setNlError] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeFiles, setCodeFiles] = useState([])
  const [selfHealingEnabled, setSelfHealingEnabled] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetch(`${API}/api/templates`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return
        setTemplates(data)
        if (!data.frameworks.find(f => f.id === frameworkId)) {
          setFrameworkId(data.frameworks[0]?.id ?? '')
        }
        if (!data.patterns.find(p => p.id === patternId)) {
          setPatternId(data.patterns[0]?.id ?? '')
        }
      })
      .catch(() => {
        if (isMounted) setError('No fue posible cargar los templates disponibles. Verifica que el servidor esté encendido.')
      })
    return () => {
      isMounted = false
    }
  }, [])

  const selectedFramework = useMemo(
    () => templates.frameworks.find(f => f.id === frameworkId),
    [templates.frameworks, frameworkId]
  )
  const selectedPattern = useMemo(
    () => templates.patterns.find(p => p.id === patternId),
    [templates.patterns, patternId]
  )

  const scoreClass = score => {
    if (score >= 0.9) return 'score-badge high'
    if (score >= 0.75) return 'score-badge medium'
    return 'score-badge low'
  }

  const analyzeWithAI = async () => {
    setAiError('')
    setAiSavedAt(null)
    const trimmedHtml = aiHtml.trim()
    const trimmedUrl = aiUrl.trim()
    if (!trimmedHtml && !trimmedUrl) {
      setAiError('Proporciona una URL o pega el HTML para analizar.')
      return
    }
    const source = trimmedHtml
      ? { type: 'html', value: trimmedHtml }
      : { type: 'url', value: trimmedUrl }
    setAiLoading(true)
    try {
      const res = await fetch(`${API}/api/locators/ai-extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'La extracción IA falló')
      }
      setAiLocators(payload?.locators || [])
      setAiMeta(payload?.meta || null)
    } catch (err) {
      setAiError(err.message || 'Error al analizar con IA')
      setAiLocators([])
      setAiMeta(null)
    } finally {
      setAiLoading(false)
    }
  }

  const convertNlToGherkin = async () => {
    setNlError('')
    setCodeError('')
    setCodeFiles([])
    if (!requirementText.trim()) {
      setNlError('Describe el flujo para generar los escenarios.')
      return
    }
    setNlLoading(true)
    try {
      const res = await fetch(`${API}/api/nl2gherkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement: requirementText })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'No se pudo transformar el flujo a Gherkin')
      }
      setGherkinFeature(payload?.feature || '')
      setGherkinScenarios(payload?.scenarios || '')
      setGherkinSource(payload?.source || '')
    } catch (err) {
      setNlError(err.message || 'Error al generar Gherkin')
    } finally {
      setNlLoading(false)
    }
  }

  const generateCodeFromGherkin = async () => {
    setCodeError('')
    setCodeFiles([])
    if (!gherkinFeature.trim() && !gherkinScenarios.trim()) {
      setCodeError('Completa el bloque Gherkin antes de generar código.')
      return
    }
    setCodeLoading(true)
    try {
      const res = await fetch(`${API}/api/gherkin2code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: gherkinFeature,
          scenarios: gherkinScenarios,
          frameworkId,
          patternId,
          dryRun: true
        })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'La generación de código aún no está disponible')
      }
      setCodeFiles(payload?.files || [])
    } catch (err) {
      setCodeError(err.message || 'Error al convertir Gherkin a código')
    } finally {
      setCodeLoading(false)
    }
  }

  const mockRecord = async () => {
    setStatus('recording')
    setError('')
    try {
      const res = await fetch(`${API}/api/locators/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'http://localhost:3000/login' })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'No se pudo obtener localizadores')
      setLocators(payload?.locators || [])

    } catch (err) {
      setError(err.message || 'Error al extraer localizadores')
    } finally {
      setStatus('idle')
    }
  }

  const generate = async () => {
    if (!locators.length) {
      setError('Genera primero los localizadores para crear el proyecto.')
      return
    }
    setStatus('generating')
    setError('')
    setGeneratedInfo(null)
    setRunResult(null)
    try {
      const res = await fetch(`${API}/api/codegen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, frameworkId, patternId, locators })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'No se pudo generar el código')
      if (!payload) throw new Error('Respuesta inválida del servidor')
      setGeneratedInfo(payload)
    } catch (err) {
      setError(err.message || 'Error al generar código')
    } finally {
      setStatus('idle')
    }
  }

  const run = async () => {
    setStatus('running')
    setError('')
    try {
      const res = await fetch(`${API}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outDir: generatedInfo?.outDir })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'No se pudo ejecutar el plan de pruebas')
      if (!payload) throw new Error('Respuesta inválida del servidor')
      setRunResult(payload)
    } catch (err) {
      setError(err.message || 'Error al ejecutar')
    } finally {
      setStatus('idle')
    }
  }

  const locatorChips = locators.map(locator => (
    <span key={locator.name} className="chip">
      <span className="chip-title">{locator.name}</span>
      <span className="chip-sub">{locator.css || locator.xpath}</span>
    </span>
  ))

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-content">
          <span className="brand-pill">LogicTest</span>
          <h1>Genera suites end-to-end en segundos</h1>
          <p>Graba interacciones, elige tu stack favorito y obtén un proyecto listo para ejecutar.</p>
        </div>
        <div className="status-card">
          <span className="status-label">Estado</span>
          <strong>{statusCopy[status]}</strong>
          {selectedFramework && selectedPattern && (
            <p className="status-meta">
              <span>{selectedFramework.name}</span>
              <span className="separator">•</span>
              <span>{selectedPattern.name}</span>
            </p>
          )}
        </div>
      </header>

      <main className="content">
        {error && <div className="alert alert-error">{error}</div>}

        <section className="panel-grid">
          <article className="panel-card">
            <div className="panel-header">
              <h2>Analizar con IA</h2>
              <p>Ingiere una URL o pega el HTML para sugerir localizadores con explicación.</p>
            </div>
            <label className="field">
              <span>URL a analizar</span>
              <input value={aiUrl} onChange={e => setAiUrl(e.target.value)} placeholder="https://app.demo/login" />
            </label>

            <div className="collapsible">
              <button type="button" className="link-button" onClick={() => setAiHtmlExpanded(prev => !prev)}>
                {aiHtmlExpanded ? 'Ocultar HTML manual' : 'Pegar HTML manualmente'}
              </button>
              {aiHtmlExpanded && (
                <textarea
                  className="html-textarea"
                  value={aiHtml}
                  onChange={e => setAiHtml(e.target.value)}
                  placeholder="&lt;html&gt;...&lt;/html&gt;"
                />)
              }
            </div>

            <div className="panel-actions">
              <button className="primary" type="button" onClick={analyzeWithAI} disabled={aiLoading}>
                {aiLoading ? 'Analizando…' : 'Analizar (IA)'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!aiLocators.length}
                onClick={() => {
                  setLocators(aiLocators)
                  setAiSavedAt(new Date().toISOString())
                }}
              >
                Guardar estos localizadores
              </button>
            </div>
            {aiError && <div className="alert alert-error small">{aiError}</div>}
            {aiMeta && (
              <div className="meta-info">
                <span>Duración: {aiMeta.elapsedMs ?? '–'} ms</span>
                <span>Fuente: {aiMeta.sourceType === 'html' ? 'HTML manual' : 'URL analizada'}</span>
                {aiMeta.warning && <span className="warning">⚠️ {aiMeta.warning}</span>}
              </div>
            )}
            {aiLocators.length ? (
              <div className="table-wrapper">
                <table className="locators-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Selector principal</th>
                      <th>Puntaje</th>
                      <th>Fallbacks</th>
                      <th>Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiLocators.map(locator => (
                      <tr key={locator.name}>
                        <td>{locator.name}</td>
                        <td>
                          <code>{locator.css || locator.xpath}</code>
                        </td>
                        <td>
                          <span className={scoreClass(locator.score ?? 0)}>{(locator.score ?? 0).toFixed(2)}</span>
                        </td>
                        <td className="fallback-cell">
                          {locator.fallbacks?.length ? (
                            locator.fallbacks.map(fallback => (
                              <span key={`${locator.name}-${fallback}`} className="pill">
                                {fallback}
                              </span>
                            ))
                          ) : (
                            <span className="muted">Sin alternativas</span>
                          )}
                        </td>
                        <td>
                          <span className="rationale" title={locator.rationale || 'Sin explicación disponible'}>
                            Ver detalle
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">Aún no se han generado localizadores IA.</p>
            )}
            {aiSavedAt && <p className="success-note">Se enviaron al Paso 1 para continuar con la generación.</p>}
          </article>

          <article className="panel-card">
            <div className="panel-header">
              <h2>Historias NL → Gherkin → Código</h2>
              <p>Describe el flujo en lenguaje natural y convierte los escenarios para tu stack.</p>
            </div>
            <label className="field">
              <span>Describe el flujo…</span>
              <textarea
                value={requirementText}
                onChange={e => setRequirementText(e.target.value)}
                placeholder="Como usuario quiero iniciar sesión para consultar mi panel"
              />
            </label>
            <button className="primary" type="button" onClick={convertNlToGherkin} disabled={nlLoading}>
              {nlLoading ? 'Generando Gherkin…' : 'Transformar a Gherkin'}
            </button>
            {nlError && <div className="alert alert-error small">{nlError}</div>}
            {(gherkinFeature || gherkinScenarios) && (
              <div className="gherkin-editors">
                <label className="field">
                  <span>Feature ({gherkinSource || 'heurística/LLM'})</span>
                  <textarea value={gherkinFeature} onChange={e => setGherkinFeature(e.target.value)} />
                </label>
                <label className="field">
                  <span>Scenarios</span>
                  <textarea value={gherkinScenarios} onChange={e => setGherkinScenarios(e.target.value)} />
                </label>
              </div>
            )}
            <div className="panel-meta-inline">
              <span>Framework: {selectedFramework?.name || 'sin seleccionar'}</span>
              <span>Patrón: {selectedPattern?.name || 'sin seleccionar'}</span>
            </div>
            <button
              className="secondary"
              type="button"
              onClick={generateCodeFromGherkin}
              disabled={codeLoading || (!gherkinFeature && !gherkinScenarios)}
            >
              {codeLoading ? 'Preparando archivos…' : 'Generar código desde Gherkin'}
            </button>
            {codeError && <div className="alert alert-error small">{codeError}</div>}
            {codeFiles.length > 0 && (
              <ul className="files-list">
                {codeFiles.map(file => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel-card slim">
            <div className="panel-header">
              <h2>Self-healing al ejecutar</h2>
              <p>Configura si se intentará reemplazar selectores inestables durante las corridas.</p>
            </div>
            <label className={`toggle ${selfHealingEnabled ? 'enabled' : ''}`}>
              <input
                type="checkbox"
                checked={selfHealingEnabled}
                onChange={e => setSelfHealingEnabled(e.target.checked)}
              />
              <span className="slider" />
              <span className="toggle-label">Intentar self-healing si falla un selector</span>
            </label>
            <p className="muted">
              {selfHealingEnabled
                ? 'Se mostrará esta preferencia cuando ejecutes las suites. (Solo UI por ahora)'
                : 'Puedes activarlo para guardar la preferencia. No realiza llamadas adicionales todavía.'}
            </p>
          </article>
        </section>

        <section className="step-grid">
          <article className="card">
            <div className="card-header">
              <span className="step-badge">Paso 1</span>
              <h2>Extrae los localizadores</h2>
              <p>Simula la grabación de una sesión para obtener localizadores con calificación automática.</p>
            </div>
            <button className="primary" onClick={mockRecord} disabled={status === 'recording'}>
              {status === 'recording' ? 'Analizando…' : 'Simular extracción'}
            </button>
            <div className="locators-wrapper">
              {locators.length ? locatorChips : <span className="empty">Aún no se han generado localizadores.</span>}
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <span className="step-badge">Paso 2</span>
              <h2>Define tu stack</h2>
              <p>Selecciona framework, patrón de diseño y nombra el proyecto. LogicTest generará la estructura completa.</p>
            </div>

            <label className="field">
              <span>Nombre del proyecto</span>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="logictest-e2e"
              />
            </label>

            <div className="option-block">
              <span className="option-title">Framework</span>
              <div className="option-grid">
                {templates.frameworks.map(framework => (
                  <button
                    key={framework.id}
                    type="button"
                    className={`option-tile ${framework.id === frameworkId ? 'active' : ''}`}
                    onClick={() => setFrameworkId(framework.id)}
                  >
                    <strong>{framework.name}</strong>
                    <span className="option-sub">Plantilla mantenida por LogicTest</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="option-block">
              <span className="option-title">Patrón</span>
              <div className="option-grid compact">
                {templates.patterns.map(pattern => (
                  <button
                    key={pattern.id}
                    type="button"
                    className={`option-tile ${pattern.id === patternId ? 'active' : ''}`}
                    onClick={() => setPatternId(pattern.id)}
                  >
                    <strong>{pattern.name}</strong>
                    <span className="option-sub">Auto-generación del esqueleto</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              className="primary"
              onClick={generate}
              disabled={status === 'generating' || !frameworkId || !patternId || !locators.length}
            >
              {status === 'generating' ? 'Generando…' : 'Generar proyecto'}
            </button>

            {generatedInfo && (
              <div className="result-panel">
                <h3>Proyecto creado</h3>
                <p className="result-meta">
                  <span>{generatedInfo.framework}</span>
                  <span className="separator">•</span>
                  <span>{generatedInfo.pattern}</span>
                </p>
                <p className="result-path">Ruta: {generatedInfo.outDir}</p>
                <details>
                  <summary>Ver archivos generados</summary>
                  <ul>
                    {generatedInfo.files?.map(file => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </article>

          <article className="card">
            <div className="card-header">
              <span className="step-badge">Paso 3</span>
              <h2>Ejecuta tu suite</h2>
              <p>Lanza un run simulado que imita la ejecución en tu CI/CD para validar el flujo completo.</p>
            </div>
            <button className="primary" onClick={run} disabled={status === 'running' || !generatedInfo}>
              {status === 'running' ? 'Ejecutando…' : 'Ejecutar pruebas mock'}
            </button>

            {runResult && (
              <div className="run-summary">
                <h3>Resultado</h3>
                <div className="metrics">
                  <span className="metric">
                    <strong>{runResult.summary.passed}</strong>
                    <span>Aprobadas</span>
                  </span>
                  <span className="metric">
                    <strong>{runResult.summary.failed}</strong>
                    <span>Fallidas</span>
                  </span>
                  <span className="metric">
                    <strong>{runResult.summary.total}</strong>
                    <span>Total</span>
                  </span>
                </div>
                <p>Duración estimada: {runResult.summary.durationSec} s</p>
              </div>
            )}
          </article>
        </section>
      </main>

      <footer className="footer">
        <span>LogicTest Studio · prototipo interactivo</span>
        <span>Listo para integrarse con tu pipeline CI</span>
      </footer>
    </div>
  )
}
