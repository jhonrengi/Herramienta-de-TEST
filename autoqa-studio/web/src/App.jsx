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
