const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { performance } = require('perf_hooks');

const { readJsonSafe } = require('./data/utils');
const { generateProject } = require('./services/codegenService');
const { createZipBuffer } = require('./utils/zipper');

const router = express.Router();

const ATTR_PRIORITY = [
  { keys: ['data-testid', 'data-test-id', 'data-test'], weight: 0.6, type: 'data' },
  { keys: ['aria-label'], weight: 0.55, type: 'aria' },
  { keys: ['aria-labelledby'], weight: 0.53, type: 'aria-ref' },
  { keys: ['name'], weight: 0.5, type: 'attr-tag' },
  { keys: ['id'], weight: 0.48, type: 'id' },
  { keys: ['placeholder'], weight: 0.42, type: 'attr-tag' }
];

const INTERACTIVE_TAGS = new Set([
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  'details'
]);

async function fetchHtmlFromUrl(url) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'AutoQA-Studio/ia-locators' } });
    if (!response.ok) {
      throw new Error(`Respuesta ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.warn('No se pudo descargar HTML desde la URL proporcionada:', error.message);
    return null;
  }
}

function isMeaningfulText(text) {
  const normalized = text.trim();
  if (!normalized) return false;
  if (normalized.length > 80) return false;
  if (/^\d+$/.test(normalized)) return false;
  return true;
}

function getElementText($, element) {
  const text = $(element).text() || '';
  return text.replace(/\s+/g, ' ').trim();
}

function findLabelText($, element) {
  const attribs = element.attribs || {};
  if (!attribs.id) return null;
  const label = $(`label[for='${attribs.id}']`).first();
  if (label && label.length) {
    const labelText = label.text().replace(/\s+/g, ' ').trim();
    return labelText || null;
  }
  return null;
}

function cssEscape(value) {
  return value.replace(/"/g, '\\"');
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function toCamel(slug) {
  return slug
    .split(' ')
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('');
}

function computeXPath(element, key, value, tagName, textFallback) {
  if (key && value) {
    return `//${tagName}[@${key}='${value.replace(/'/g, "&apos;")}']`;
  }
  if (textFallback) {
    const safe = textFallback.replace(/'/g, "&apos;");
    return `//${tagName}[normalize-space(.)='${safe}']`;
  }
  return `//${tagName}`;
}

function depthScore(element) {
  if (!element) {
    return 0;
  }
  let depth = 0;
  let current = element.parent;
  while (current) {
    depth += 1;
    current = current.parent;
  }
  return Math.max(0, 0.24 - depth * 0.02);
}

function resolveAttrMatch(attribs) {
  for (const entry of ATTR_PRIORITY) {
    for (const key of entry.keys) {
      if (attribs[key]) {
        return { key, value: attribs[key], meta: entry };
      }
    }
  }
  return null;
}

function buildPrimarySelector(tagName, match, attribs) {
  if (!match) {
    return null;
  }
  const { key, value, meta } = match;
  const escaped = cssEscape(value);
  switch (meta.type) {
    case 'data':
    case 'aria':
      return `[${key}="${escaped}"]`;
    case 'attr-tag':
      return `${tagName}[${key}="${escaped}"]`;
    case 'id':
      if (/^[a-zA-Z_][a-zA-Z0-9\-_:.]*$/.test(value)) {
        return `#${value}`;
      }
      return `${tagName}[id="${escaped}"]`;
    case 'aria-ref': {
      const label = attribs[key];
      if (label) {
        return `[${key}="${cssEscape(label)}"]`;
      }
      return null;
    }
    default:
      return `${tagName}[${key}="${escaped}"]`;
  }
}

function buildFallbacks(tagName, match, attribs, text, labelText) {
  const fallbacks = [];
  if (attribs.role && isMeaningfulText(text)) {
    fallbacks.push(`role=${attribs.role} name="${text}"`);
  }
  if (labelText) {
    fallbacks.push(`text="${labelText}"`);
  }
  if (isMeaningfulText(text)) {
    fallbacks.push(`text="${text}"`);
  }
  if (match && match.key !== 'id' && attribs.id) {
    fallbacks.push(`#${attribs.id}`);
  }
  if (match && match.key !== 'name' && attribs.name) {
    fallbacks.push(`${tagName}[name="${cssEscape(attribs.name)}"]`);
  }
  return Array.from(new Set(fallbacks));
}

function scoreElement($, selector, match, text, tagName) {
  let score = 0.35;
  if (match) {
    score += match.meta.weight;
  }
  let firstMatch = null;
  if (selector) {
    try {
      const matched = $(selector);
      const count = matched.length;
      if (count === 1) {
        score += 0.25;
      } else if (count <= 3) {
        score += 0.12;
      } else {
        score -= 0.05;
      }
      firstMatch = matched.get(0) || null;
    } catch (error) {
      score -= 0.1;
    }
  }
  score += depthScore(firstMatch);
  if (isMeaningfulText(text)) {
    score += 0.08;
  }
  if (!INTERACTIVE_TAGS.has(tagName)) {
    score -= 0.08;
  }
  return Math.max(0.1, Math.min(1, Number(score.toFixed(2))));
}

function dedupeBySelector(locators) {
  const seen = new Set();
  return locators.filter(locator => {
    const key = `${locator.css || ''}|${locator.xpath || ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function ensureUniqueNames(locators) {
  const used = new Set();
  for (const locator of locators) {
    let base = locator.name;
    if (!base) {
      base = 'element';
    }
    let candidate = base;
    let counter = 1;
    while (used.has(candidate)) {
      counter += 1;
      candidate = `${base}${counter}`;
    }
    locator.name = candidate;
    used.add(candidate);
  }
  return locators;
}

function buildLocatorName(match, text, tagName) {
  if (match && match.value) {
    const slug = slugify(match.value);
    if (slug) {
      return toCamel(slug);
    }
  }
  if (isMeaningfulText(text)) {
    return toCamel(slugify(text));
  }
  return `${tagName}Element`;
}

function describeRationale(match, text, selector, fallbacks) {
  const reasons = [];
  if (match) {
    const label = match.key.replace('data-', 'data ');
    reasons.push(`Selector principal construido con ${label}`);
  } else if (selector) {
    reasons.push('Selector generado por estructura del DOM');
  }
  if (isMeaningfulText(text)) {
    reasons.push(`Texto visible utilizado como respaldo: "${text}"`);
  }
  if (fallbacks.length) {
    reasons.push('Se añadieron fallbacks para mejorar la resiliencia');
  }
  return reasons.join('. ');
}

function computeLocatorCandidates(html) {
  const $ = cheerio.load(html);
  const locators = [];

  $('body *').each((_, element) => {
    const attribs = element.attribs || {};
    const tagName = element.name || element.tagName || '';
    if (!tagName) return;

    const text = getElementText($, element);
    const labelText = findLabelText($, element);
    const match = resolveAttrMatch(attribs);
    if (!match && !isMeaningfulText(text) && !labelText) {
      return;
    }

    const selector = buildPrimarySelector(tagName, match, attribs);
    if (!selector && !isMeaningfulText(text) && !labelText) {
      return;
    }

    const targetSelector = selector || `${tagName}`;
    const xpath = computeXPath(element, match ? match.key : null, match ? match.value : null, tagName, text || labelText || null);
    const fallbacks = buildFallbacks(tagName, match, attribs, text, labelText);
    const score = scoreElement($, targetSelector, match, text, tagName);
    const name = buildLocatorName(match, text || labelText || '', tagName);
    const rationale = describeRationale(match, text || labelText || '', targetSelector, fallbacks);

    locators.push({
      name,
      css: targetSelector,
      xpath,
      score,
      fallbacks,
      rationale
    });
  });

  const cleaned = dedupeBySelector(locators)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  return ensureUniqueNames(cleaned);
}

function extractFeatureTitle(requirement) {
  if (!requirement) return 'Automatización web';
  const firstSentence = requirement.split(/[.!?\n]/).map(part => part.trim()).find(Boolean) || 'Automatización web';
  const slug = slugify(firstSentence);
  if (!slug) return 'Automatización web';
  return slug
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function deriveScenarioSteps(requirement) {
  const lower = (requirement || '').toLowerCase();
  const steps = [];

  if (lower.includes('login') || lower.includes('iniciar sesión')) {
    steps.push('Given que estoy en la página de login');
    steps.push('When ingreso credenciales válidas');
    steps.push('Then visualizo el panel principal');
  } else if (lower.includes('registr') || lower.includes('signup') || lower.includes('alta')) {
    steps.push('Given que estoy en el formulario de registro');
    steps.push('When completo los campos obligatorios');
    steps.push('Then se muestra el mensaje de bienvenida');
  } else if (lower.includes('buscar') || lower.includes('search')) {
    steps.push('Given que estoy en la página de resultados');
    steps.push('When busco el término deseado');
    steps.push('Then verifico que los resultados sean relevantes');
  } else {
    steps.push('Given que el usuario ingresa a la aplicación web');
    steps.push('When ejecuta el flujo descrito');
    steps.push('Then se valida el resultado esperado');
  }

  if (lower.includes('recordar') || lower.includes('mantener sesión')) {
    steps.splice(steps.length - 1, 0, 'And marco la opción de recordar usuario');
  }

  return steps;
}

function buildHeuristicGherkin(requirement) {
  const featureTitle = extractFeatureTitle(requirement);
  const scenarioTitle = `Escenario principal (${featureTitle})`;
  const steps = deriveScenarioSteps(requirement);

  const feature = [`Feature: ${featureTitle}`, '  Como usuario de la aplicación', '  Quiero automatizar el flujo descrito', '  Para validar la funcionalidad de forma continua'].join('\n');
  const scenarioLines = [`Scenario: ${scenarioTitle}`, ...steps.map(step => `  ${step}`)];

  return {
    feature,
    scenarios: scenarioLines.join('\n')
  };
}

async function callOpenAI(requirement) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un analista QA que escribe escenarios Gherkin en español.'
        },
        {
          role: 'user',
          content: `Redacta una característica Gherkin con al menos un escenario a partir de este requerimiento:\n${requirement}`
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`Error en OpenAI: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Respuesta vacía de OpenAI');
  }
  return content;
}

async function callOllama(requirement) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1',
      prompt: `Genera una característica Gherkin en español basada en: ${requirement}. Debe incluir Feature y al menos un Scenario con pasos Given/When/Then.`,
      stream: false
    })
  });
  if (!response.ok) {
    throw new Error(`Error en Ollama: ${response.status}`);
  }
  const payload = await response.json();
  if (!payload?.response) {
    throw new Error('Respuesta vacía de Ollama');
  }
  return payload.response;
}

async function generateGherkinFromLLM(requirement) {
  const provider = (process.env.LLM_PROVIDER || 'none').toLowerCase();
  if (provider === 'none') {
    return null;
  }
  try {
    if (provider === 'openai') {
      return await callOpenAI(requirement);
    }
    if (provider === 'ollama') {
      return await callOllama(requirement);
    }
    console.warn(`Proveedor LLM no soportado (${provider}). Se usará heurística.`);
    return null;
  } catch (error) {
    console.warn('Fallo al invocar LLM, se utilizará heurística:', error.message);
    return null;
  }
}

function splitGherkinBlocks(text) {
  if (!text) {
    return { feature: '', scenarios: '' };
  }
  const lines = text.split(/\r?\n/);
  const featureLines = [];
  const scenarioLines = [];
  let collectingFeature = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^scenario:/i.test(trimmed)) {
      collectingFeature = false;
    }
    if (collectingFeature) {
      featureLines.push(trimmed);
    } else {
      scenarioLines.push(trimmed);
    }
  }
  return {
    feature: featureLines.join('\n'),
    scenarios: scenarioLines.join('\n')
  };
}

router.post('/locators/ai-extract', async (req, res) => {
  const started = performance.now();
  const { source } = req.body || {};
  if (!source || !source.type || !source.value) {
    return res.status(400).json({ error: 'Debes proporcionar source.type y source.value' });
  }

  let html = null;
  let warning = null;
  if (source.type === 'html') {
    html = source.value;
  } else if (source.type === 'url') {
    html = await fetchHtmlFromUrl(source.value);
    if (!html) {
      warning = 'No se pudo descargar la página, revisa la URL o proporciona el HTML manualmente.';
      html = '<html><body></body></html>';
    }
  } else {
    return res.status(400).json({ error: 'source.type debe ser "url" o "html"' });
  }

  const locators = computeLocatorCandidates(html || '');
  const elapsedMs = Math.round(performance.now() - started);

  const meta = {
    sourceType: source.type,
    elapsedMs
  };
  if (warning) {
    meta.warning = warning;
  }

  res.json({ locators, meta });
});

router.post('/nl2gherkin', async (req, res) => {
  const { requirement } = req.body || {};
  if (!requirement || !requirement.trim()) {
    return res.status(400).json({ error: 'Debes describir el flujo en el campo requirement.' });
  }

  const llmResult = await generateGherkinFromLLM(requirement);
  if (llmResult) {
    const blocks = splitGherkinBlocks(llmResult);
    if (blocks.feature || blocks.scenarios) {
      return res.json({ ...blocks, source: 'llm' });
    }
  }

  const heuristic = buildHeuristicGherkin(requirement);
  return res.json({ ...heuristic, source: 'heuristic' });
});

function joinGherkinPieces({ gherkin, feature, scenarios }) {
  const parts = [];
  if (gherkin && gherkin.trim()) {
    parts.push(gherkin.trim());
  } else {
    if (feature && feature.trim()) {
      parts.push(feature.trim());
    }
    if (scenarios && scenarios.trim()) {
      parts.push(scenarios.trim());
    }
  }
  return parts.join('\n\n').trim();
}

function summarizeGherkin(raw) {
  const text = (raw || '').replace(/\r/g, '');
  const lines = text.split('\n');
  const summary = {
    feature: null,
    scenarios: [],
    totalScenarios: 0,
    totalSteps: 0,
    text
  };

  let currentScenario = null;
  let scenarioCount = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const featureMatch = line.match(/^Feature:\s*(.+)/i);
    if (featureMatch) {
      summary.feature = featureMatch[1].trim() || 'Feature sin título';
      currentScenario = null;
      continue;
    }

    const scenarioMatch = line.match(/^(Scenario(?: Outline)?):\s*(.+)/i);
    if (scenarioMatch) {
      scenarioCount += 1;
      currentScenario = {
        name: scenarioMatch[2].trim() || `Escenario ${scenarioCount}`,
        type: scenarioMatch[1],
        steps: []
      };
      summary.scenarios.push(currentScenario);
      continue;
    }

    const stepMatch = line.match(/^(Given|When|Then|And|But|\*)\s+(.*)/i);
    if (stepMatch) {
      if (!currentScenario) {
        scenarioCount += 1;
        currentScenario = {
          name: `Escenario ${scenarioCount}`,
          type: 'Scenario',
          steps: []
        };
        summary.scenarios.push(currentScenario);
      }
      currentScenario.steps.push({ keyword: stepMatch[1], text: stepMatch[2].trim() });
      summary.totalSteps += 1;
    }
  }

  summary.totalScenarios = summary.scenarios.length;
  if (!summary.feature) {
    summary.feature = 'Feature sin título';
  }
  return summary;
}

router.post('/gherkin2code', (req, res) => {
  const {
    gherkin,
    feature,
    scenarios,
    frameworkId,
    patternId,
    locators = [],
    projectName = 'gherkin-preview',
    dryRun = true
  } = req.body || {};

  const gherkinText = joinGherkinPieces({ gherkin, feature, scenarios });
  if (!gherkinText) {
    return res.status(400).json({ error: 'Completa el bloque Gherkin antes de solicitar el código.' });
  }
  if (!frameworkId) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un framework para generar el código.' });
  }

  const summary = summarizeGherkin(gherkinText);

  let preview;
  try {
    preview = generateProject({
      projectName: projectName || 'gherkin-preview',
      frameworkId,
      patternId,
      locators,
      writeOutput: !dryRun ? true : false
    });
  } catch (error) {
    const message = error.message || 'No fue posible preparar la plantilla solicitada.';
    const statusCode = /Template no disponible|patrón/.test(message) ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }

  const files = Object.entries(preview.files || {}).map(([path, contents]) => ({
    path,
    size: Buffer.byteLength(contents, 'utf8')
  }));

  const scenarioStats = summary.scenarios.map(item => ({
    name: item.name,
    type: item.type,
    steps: item.steps.length
  }));

  return res.json({
    files,
    summary: {
      framework: preview.framework,
      pattern: preview.pattern,
      feature: summary.feature,
      totalScenarios: summary.totalScenarios,
      totalSteps: summary.totalSteps,
      scenarios: scenarioStats,
      dryRun: Boolean(dryRun)
    },
    gherkin: summary.text
  });
});

router.post('/gherkin2code/export', (req, res) => {
  const {
    gherkin,
    feature,
    scenarios,
    frameworkId,
    patternId,
    locators = [],
    projectName = 'gherkin-project',
    format = 'zip'
  } = req.body || {};

  const gherkinText = joinGherkinPieces({ gherkin, feature, scenarios });
  if (!gherkinText) {
    return res.status(400).json({ error: 'Completa el bloque Gherkin antes de exportar el proyecto.' });
  }
  if (!frameworkId) {
    return res.status(400).json({ error: 'Selecciona un framework válido antes de exportar.' });
  }
  if (format !== 'zip') {
    return res.status(400).json({ error: 'Por ahora solo se soporta la exportación ZIP.' });
  }

  let project;
  try {
    project = generateProject({
      projectName: projectName || 'gherkin-project',
      frameworkId,
      patternId,
      locators,
      writeOutput: true
    });
  } catch (error) {
    const message = error.message || 'No fue posible preparar el paquete solicitado.';
    const statusCode = /Template no disponible|patrón/.test(message) ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }

  let zipBuffer;
  try {
    zipBuffer = createZipBuffer(project.files || {});
  } catch (error) {
    return res.status(500).json({ error: error.message || 'No se pudo empaquetar el proyecto.' });
  }

  const safeName = (slugify(projectName || 'autoqa-project') || 'autoqa-project').replace(/\s+/g, '-');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.zip"`);
  res.setHeader('Content-Length', zipBuffer.length);
  return res.send(zipBuffer);
});

router.post('/selfheal', (req, res) => {
  const { historyKey } = req.body || {};
  if (!historyKey) {
    return res.status(400).json({ error: 'historyKey requerido para self-healing.' });
  }
  const stored = readJsonSafe(`locators/${historyKey}.json`, { suggestions: [] });
  return res.json({
    patched: null,
    reason: 'Endpoint en modo preparación, se devolverán datos almacenados cuando existan.',
    learned: false,
    history: stored
  });
});

module.exports = router;
