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
  const [aiUrl, setAiUrl] = useState('')
  const [aiHtml, setAiHtml] = useState('')
  const [aiCollapsed, setAiCollapsed] = useState(true)
  const [aiLocators, setAiLocators] = useState([])
  const [aiMeta, setAiMeta] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [nlRequirement, setNlRequirement] = useState('')
  const [gherkinPreview, setGherkinPreview] = useState('')
  const [gherkinFiles, setGherkinFiles] = useState([])
  const [gherkinSummary, setGherkinSummary] = useState(null)
  const [nlError, setNlError] = useState('')
  const [codegenError, setCodegenError] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const [gherkinCodeLoading, setGherkinCodeLoading] = useState(false)
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
    setCodegenError('')
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

  const analyzeWithAI = async () => {
    const trimmedHtml = aiHtml.trim()
    const trimmedUrl = aiUrl.trim()
    const source = trimmedHtml
      ? { type: 'html', value: trimmedHtml }
      : trimmedUrl
        ? { type: 'url', value: trimmedUrl }
        : null

    if (!source) {
      setAiError('Proporciona una URL o pega HTML para analizar.')
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiMeta(null)
    try {
      const res = await fetch(`${API}/api/locators/ai-extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'No se pudo analizar el contenido con IA')
      if (!payload) throw new Error('Respuesta inválida del servidor')
      setAiLocators(payload.locators || [])
      setAiMeta(payload.meta || null)
    } catch (err) {
      setAiError(err.message || 'Error al analizar con IA')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveAiLocators = () => {
    if (!aiLocators.length) {
      setAiError('No hay localizadores para guardar en el plan actual.')
      return
    }
    setLocators(aiLocators)
    setAiError('')
  }

  const generateGherkin = async () => {
    const requirement = nlRequirement.trim()
    if (!requirement) {
      setNlError('Describe el flujo para generar Gherkin.')
      return
    }

    setNlLoading(true)
    setNlError('')
    try {
      const res = await fetch(`${API}/api/nl2gherkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'No se pudo generar el Gherkin')
      if (!payload) throw new Error('Respuesta inválida del servidor')
      const { feature = '', scenarios = '' } = payload
      setGherkinPreview([feature.trim(), scenarios.trim()].filter(Boolean).join('\n\n'))
      setGherkinFiles([])
      setGherkinSummary(null)
    } catch (err) {
      setNlError(err.message || 'Error al transformar la historia en Gherkin')
    } finally {
      setNlLoading(false)
    }
  }

  const generateCodeFromGherkin = async () => {
    const gherkin = gherkinPreview.trim()
    if (!gherkin) {
      setCodegenError('Genera o edita un Gherkin válido antes de solicitar el código.')
      return
    }

    if (!frameworkId || !patternId) {
      setCodegenError('Selecciona framework y patrón para continuar.')
      return
    }

    setGherkinCodeLoading(true)
    setCodegenError('')
    try {
      const res = await fetch(`${API}/api/gherkin2code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameworkId, patternId, gherkin })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'No se pudo simular la generación de código')
      if (!payload) throw new Error('Respuesta inválida del servidor')
      setGherkinFiles(payload.files || [])
      setGherkinSummary(payload.summary || null)
    } catch (err) {
      setCodegenError(err.message || 'Error al generar código desde Gherkin')
    } finally {
      setGherkinCodeLoading(false)
    }
  }

  const locatorChips = locators.map(locator => (
    <span key={locator.name} className="chip">
      <span className="chip-title">{locator.name}</span>
      <span className="chip-sub">{locator.css || locator.xpath}</span>
    </span>
  ))

  const renderScoreBadge = score => {
    const value = typeof score === 'number' ? Math.max(0, Math.min(score, 1)) : 0
    let tone = 'low'
    if (value >= 0.9) tone = 'high'
    else if (value >= 0.75) tone = 'mid'
    return (
      <span className={`score-badge ${tone}`} title={`Confianza: ${(value * 100).toFixed(0)}%`}>
        {value.toFixed(2)}
      </span>
    )
  }

  const mainSelector = locator => locator.css || locator.xpath || locator.fallbacks?.[0] || '—'

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

        <section className="ai-sections">
          <article className="card ai-card">
            <div className="card-header">
              <h2>Analizar con IA</h2>
              <p>Obtén localizadores inteligentes desde una URL o HTML pegado. Calculamos puntuaciones, alternativas y explicación.</p>
            </div>

            <div className="ai-inputs">
              <label className="field">
                <span>URL pública</span>
                <input
                  value={aiUrl}
                  onChange={e => setAiUrl(e.target.value)}
                  placeholder="https://mi-app/login"
                />
              </label>

              <button
                type="button"
                className="toggle-html"
                onClick={() => setAiCollapsed(prev => !prev)}
              >
                {aiCollapsed ? 'Pegar HTML manualmente' : 'Ocultar HTML pegado'}
              </button>

              {!aiCollapsed && (
                <label className="field">
                  <span>HTML de la página</span>
                  <textarea
                    value={aiHtml}
                    onChange={e => setAiHtml(e.target.value)}
                    placeholder="&lt;html&gt;...&lt;/html&gt;"
                    rows={6}
                  />
                </label>
              )}
            </div>

            {aiError && <div className="alert alert-error small">{aiError}</div>}

            <div className="ai-actions">
              <button className="primary" onClick={analyzeWithAI} disabled={aiLoading}>
                {aiLoading ? 'Analizando…' : 'Analizar (IA)'}
              </button>
              <button className="secondary" onClick={handleSaveAiLocators} disabled={!aiLocators.length}>
                Guardar estos localizadores
              </button>
            </div>

            {aiMeta && (
              <p className="ai-meta">Fuente: {aiMeta.sourceType} · Tiempo: {Math.round(aiMeta.elapsedMs)} ms</p>
            )}

            <div className="ai-table-wrapper">
              {aiLocators.length ? (
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Selector principal</th>
                      <th>Score</th>
                      <th>Fallbacks</th>
                      <th>Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiLocators.map(locator => (
                      <tr key={locator.name}>
                        <td>{locator.name}</td>
                        <td className="mono">{mainSelector(locator)}</td>
                        <td>{renderScoreBadge(locator.score ?? 0)}</td>
                        <td>
                          <div className="fallback-list">
                            {(locator.fallbacks || []).map((fb, idx) => (
                              <span key={`${locator.name}-fb-${idx}`} className="fallback-pill" title={fb}>
                                {fb}
                              </span>
                            ))}
                            {!locator.fallbacks?.length && <span className="fallback-pill muted">—</span>}
                          </div>
                        </td>
                        <td>
                          <span className="rationale-pill" title={locator.rationale || 'Sin explicación disponible'}>
                            Ver
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty">Aún no hay resultados. Ingresa una fuente y ejecuta “Analizar (IA)”.</p>
              )}
            </div>
          </article>

          <article className="card ai-card">
            <div className="card-header">
              <h2>Historias en lenguaje natural → Gherkin → Código</h2>
              <p>Describe tu flujo, genera escenarios Gherkin editables y obtén el código usando las plantillas existentes.</p>
            </div>

            <label className="field">
              <span>Describe el flujo…</span>
              <textarea
                value={nlRequirement}
                onChange={e => setNlRequirement(e.target.value)}
                placeholder="Como usuario quiero iniciar sesión con mis credenciales válidas…"
                rows={4}
              />
            </label>

            {nlError && <div className="alert alert-error small">{nlError}</div>}

            <button className="primary" onClick={generateGherkin} disabled={nlLoading}>
              {nlLoading ? 'Generando…' : 'Generar Gherkin'}
            </button>

            {gherkinPreview && (
              <label className="field">
                <span>Escenarios Gherkin (editable)</span>
                <textarea
                  value={gherkinPreview}
                  onChange={e => setGherkinPreview(e.target.value)}
                  rows={10}
                  className="gherkin-preview"
                />
              </label>
            )}

            <div className="mini-selectors">
              <label className="field compact">
                <span>Framework</span>
                <select value={frameworkId} onChange={e => setFrameworkId(e.target.value)}>
                  {templates.frameworks.map(framework => (
                    <option key={framework.id} value={framework.id}>
                      {framework.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact">
                <span>Patrón</span>
                <select value={patternId} onChange={e => setPatternId(e.target.value)}>
                  {templates.patterns.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {codegenError && <div className="alert alert-error small">{codegenError}</div>}

            <button
              className="secondary"
              onClick={generateCodeFromGherkin}
              disabled={gherkinCodeLoading || !gherkinPreview}
            >
              {gherkinCodeLoading ? 'Preparando…' : 'Generar código desde Gherkin'}
            </button>

            {!!gherkinFiles.length && (
              <div className="gherkin-output">
                <h3>Archivos generados (dry-run)</h3>
                <ul>
                  {gherkinFiles.map(file => (
                    <li key={file.path || file}>{file.path || file}</li>
                  ))}
                </ul>
                {gherkinSummary && (
                  <p className="gherkin-summary">
                    {gherkinSummary.framework} · {gherkinSummary.pattern} · Escenarios: {gherkinSummary.totalScenarios} · Pasos: {gherkinSummary.totalSteps}
                  </p>
                )}
              </div>
            )}
          </article>

          <article className="card ai-card">
            <div className="card-header">
              <h2>Self-healing al ejecutar</h2>
              <p>Activa un intento automático de reparación cuando un selector falle durante la ejecución.</p>
            </div>

            <label className="toggle">
              <input
                type="checkbox"
                checked={selfHealingEnabled}
                onChange={e => setSelfHealingEnabled(e.target.checked)}
              />
              <span>Intentar self-healing si falla un selector</span>
            </label>
            <p className="hint">Cuando un selector falle, se propondrá un alterno usando el historial y podrás guardarlo.</p>
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
