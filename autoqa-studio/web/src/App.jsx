import React, { useEffect, useState } from 'react'

const API = 'http://localhost:8787'

export default function App(){
  const [templates, setTemplates] = useState({frameworks:[], patterns:[]})
  const [locators, setLocators] = useState([])
  const [frameworkId, setFrameworkId] = useState('playwright-ts')
  const [patternId, setPatternId] = useState('pom')
  const [projectName, setProjectName] = useState('mi-proyecto-autoqa')
  const [runResult, setRunResult] = useState(null)

  useEffect(()=>{
    fetch(`${API}/api/templates`).then(r=>r.json()).then(setTemplates).catch(()=>{})
  },[])

  const mockRecord = async ()=>{
    const res = await fetch(`${API}/api/locators/extract`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ url: 'http://localhost:3000/login' })
    })
    const data = await res.json()
    setLocators(data.locators || [])
  }

  const generate = async ()=>{
    const res = await fetch(`${API}/api/codegen`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ projectName, frameworkId, patternId, locators })
    })
    const data = await res.json()
    alert('Código generado en: ' + data.outDir + '\n' + (data.files||[]).join('\n'))
  }

  const run = async ()=>{
    const res = await fetch(`${API}/api/run`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({})
    })
    const data = await res.json()
    setRunResult(data)
  }

  return (
    <div style={{fontFamily:'system-ui, sans-serif', padding:20}}>
      <h1>AutoQA Studio (Demo)</h1>
      <p>Graba/extrae localizadores, elige framework, genera código y ejecuta.</p>

      <section style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
        <div style={{border:'1px solid #ddd', borderRadius:12, padding:16}}>
          <h2>1) Record / Extract</h2>
          <button onClick={mockRecord}>Simular grabación y extracción</button>
          <ul>
            {locators.map(l=><li key={l.name}><b>{l.name}</b> — css: <code>{l.css}</code> — score {Math.round(l.score*100)}%</li>)}
          </ul>
        </div>

        <div style={{border:'1px solid #ddd', borderRadius:12, padding:16}}>
          <h2>2) Elegir stack</h2>
          <label>Nombre del proyecto<br/>
            <input value={projectName} onChange={e=>setProjectName(e.target.value)}/>
          </label>
          <div style={{marginTop:10}}>
            <label>Framework<br/>
              <select value={frameworkId} onChange={e=>setFrameworkId(e.target.value)}>
                {templates.frameworks.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{marginTop:10}}>
            <label>Patrón<br/>
              <select value={patternId} onChange={e=>setPatternId(e.target.value)}>
                {templates.patterns.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{marginTop:10}}>
            <button onClick={generate} disabled={!locators.length}>Generar código</button>
          </div>
        </div>
      </section>

      <section style={{border:'1px solid #ddd', borderRadius:12, padding:16, marginTop:20}}>
        <h2>3) Ejecutar</h2>
        <button onClick={run}>Ejecutar pruebas (mock)</button>
        {runResult && (
          <div style={{marginTop:10}}>
            <div>Estado: <b>{runResult.status}</b></div>
            <div>Resumen: {runResult.summary.total} total / {runResult.summary.passed} ok / {runResult.summary.failed} fail</div>
          </div>
        )}
      </section>
    </div>
  )
}
