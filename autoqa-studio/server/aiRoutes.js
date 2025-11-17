const express = require('express');
let fetchImpl;
try {
  const nodeFetch = require('node-fetch');
  fetchImpl = nodeFetch.default || nodeFetch;
} catch (error) {
  if (typeof global.fetch === 'function') {
    console.warn('node-fetch no disponible, se usa fetch nativo.');
    fetchImpl = (...args) => global.fetch(...args);
  } else {
    throw error;
  }
}
const fetch = (...args) => fetchImpl(...args);
let cheerio;
try {
  cheerio = require('cheerio');
} catch (error) {
  console.warn('cheerio no disponible, se usa un parser mínimo.');
  cheerio = { load: createMiniCheerio };
}
const { performance } = require('perf_hooks');

const { saveJson, readJsonSafe } = require('./data/utils');
const { generateProject } = require('./services/codegenService');

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

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function parseAttributes(attrString = '') {
  const attribs = {};
  const attrRegex = /([a-zA-Z0-9:_-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = attrRegex.exec(attrString))) {
    const key = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    attribs[key] = value;
  }
  return attribs;
}

function parseSimpleHtml(html = '') {
  const root = { type: 'root', tagName: 'root', attribs: {}, children: [], parent: null };
  const stack = [root];
  const tokenRegex = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g;
  let match;

  while ((match = tokenRegex.exec(html))) {
    const token = match[0];
    if (token.startsWith('<!--')) {
      continue;
    }
    if (token.startsWith('</')) {
      const tagName = token.slice(2, -1).trim().toLowerCase();
      while (stack.length > 1) {
        const node = stack.pop();
        if (node.tagName === tagName) {
          break;
        }
      }
      continue;
    }
    if (token.startsWith('<')) {
      const selfClosing = /\/>$/.test(token);
      let inner = token.slice(1, token.length - 1);
      if (selfClosing && inner.endsWith('/')) {
        inner = inner.slice(0, -1);
      }
      inner = inner.trim();
      if (!inner) continue;
      const firstSpace = inner.search(/\s/);
      let tagName;
      let attrString = '';
      if (firstSpace === -1) {
        tagName = inner.toLowerCase();
      } else {
        tagName = inner.slice(0, firstSpace).toLowerCase();
        attrString = inner.slice(firstSpace + 1);
      }
      const attribs = parseAttributes(attrString);
      const parent = stack[stack.length - 1];
      const node = { type: 'tag', name: tagName, tagName, attribs, children: [], parent };
      parent.children.push(node);
      if (!selfClosing && !VOID_TAGS.has(tagName)) {
        stack.push(node);
      }
      continue;
    }
    const textValue = token;
    const parent = stack[stack.length - 1];
    if (!parent) continue;
    parent.children.push({ type: 'text', value: textValue, parent });
  }

  return root;
}

function collectText(node) {
  if (!node) return '';
  if (node.type === 'text') {
    return node.value || '';
  }
  const children = node.children || [];
  return children.map(child => collectText(child)).join('');
}

function createWrapper(nodes) {
  const wrapper = {
    length: nodes.length,
    each(callback) {
      nodes.forEach((node, index) => callback(index, node));
      return wrapper;
    },
    get(index) {
      return nodes[index];
    },
    first() {
      return createWrapper(nodes.length ? [nodes[0]] : []);
    },
    text() {
      return nodes.map(node => collectText(node)).join('');
    }
  };
  return wrapper;
}

function buildMatcher(selector) {
  const trimmed = selector.trim();
  if (!trimmed) return null;
  if (trimmed === '*') {
    return () => true;
  }
  if (trimmed.startsWith('#')) {
    const id = trimmed.slice(1);
    return node => (node.attribs.id || '') === id;
  }

  const attrWithTagRegex = /^(?<tag>[a-zA-Z0-9:_-]+)?\s*\[\s*(?<key>[a-zA-Z0-9:_-]+)\s*(?<op>[*^$|~]?=)\s*['"]?(?<value>[^'"\]]+)['"]?\s*\]$/;
  const attrOnlyRegex = /^\[\s*(?<key>[a-zA-Z0-9:_-]+)\s*(?<op>[*^$|~]?=)\s*['"]?(?<value>[^'"\]]+)['"]?\s*\]$/;
  let attrMatch = attrWithTagRegex.exec(trimmed) || attrOnlyRegex.exec(trimmed);
  if (attrMatch) {
    const tag = attrMatch.groups.tag ? attrMatch.groups.tag.toLowerCase() : null;
    const key = (attrMatch.groups.key || '').toLowerCase();
    const op = attrMatch.groups.op || '=';
    const value = attrMatch.groups.value || '';
    return node => {
      if (tag && node.tagName !== tag) return false;
      const attrValue = node.attribs[key];
      if (typeof attrValue !== 'string') return false;
      switch (op) {
        case '=':
          return attrValue === value;
        case '*=':
          return attrValue.includes(value);
        case '^=':
          return attrValue.startsWith(value);
        case '$=':
          return attrValue.endsWith(value);
        default:
          return attrValue === value;
      }
    };
  }

  return node => node.tagName === trimmed.toLowerCase();
}

function traverse(node, visitor) {
  for (const child of node.children || []) {
    if (child.type === 'tag') {
      visitor(child);
      traverse(child, visitor);
    }
  }
}

function getDescendantElements(node) {
  const results = [];
  traverse(node, descendant => {
    results.push(descendant);
  });
  return results;
}

function findMatches(root, selector) {
  let cleaned = selector.trim();
  if (!cleaned) return [];

  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map(part => part.trim()).filter(Boolean);
    const seen = new Set();
    const result = [];
    for (const part of parts) {
      for (const node of findMatches(root, part)) {
        if (!seen.has(node)) {
          seen.add(node);
          result.push(node);
        }
      }
    }
    return result;
  }

  const descendantMatch = cleaned.match(/^(?<parent>[a-zA-Z0-9:_-]+)\s+\*$/);
  if (descendantMatch) {
    const parentSelector = descendantMatch.groups.parent;
    const parentMatcher = buildMatcher(parentSelector);
    if (!parentMatcher) return [];
    const parents = [];
    traverse(root, node => {
      if (parentMatcher(node)) {
        parents.push(node);
      }
    });
    return parents.flatMap(node => getDescendantElements(node));
  }

  const matcher = buildMatcher(cleaned);
  if (!matcher) return [];
  const matches = [];
  traverse(root, node => {
    if (matcher(node)) {
      matches.push(node);
    }
  });
  return matches;
}

function createMiniCheerio(html) {
  const root = parseSimpleHtml(html || '');
  const $ = selectorOrNode => {
    if (typeof selectorOrNode === 'string') {
      const nodes = findMatches(root, selectorOrNode);
      return createWrapper(nodes);
    }
    if (selectorOrNode && typeof selectorOrNode === 'object') {
      return createWrapper([selectorOrNode]);
    }
    return createWrapper([]);
  };
  $.root = root;
  return $;
}

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

function resolveAttrMatch(tagName, attribs) {
  for (const entry of ATTR_PRIORITY) {
    for (const key of entry.keys) {
      if (attribs[key]) {
        return { key, value: attribs[key], meta: entry };
      }
    }
  }
  if (tagName === 'input' && attribs.type) {
    const normalized = attribs.type.toLowerCase();
    if (normalized === 'password' || normalized === 'email') {
      return {
        key: 'type',
        value: attribs.type,
        meta: { keys: ['type'], weight: 0.36, type: 'attr-tag' }
      };
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
  if (match && match.key && match.value) {
    const safeValue = match.value.replace(/'/g, "&apos;");
    fallbacks.push(`xpath=//${tagName}[@${match.key}='${safeValue}']`);
  } else if (isMeaningfulText(text)) {
    const safeText = text.replace(/'/g, "&apos;");
    fallbacks.push(`xpath=//${tagName}[contains(normalize-space(.),'${safeText}')]`);
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
  return Math.max(0.1, Math.min(0.99, Number(score.toFixed(2))));
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
    const match = resolveAttrMatch(tagName, attribs);
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

const STEP_REGEX = /^(given|when|then|and|but|dado|cuando|entonces|y|pero)\b/i;
const SCENARIO_REGEX = /^(scenario(?: outline)?|escenario(?:\s+de\s+ejemplos)?|escenario(?:\s+outline)?)/i;
const FEATURE_REGEX = /^(feature|característica)/i;

function parseGherkinText(gherkinText = '') {
  const lines = gherkinText.split(/\r?\n/);
  const scenarios = [];
  let currentScenario = null;
  let featureName = null;
  let totalSteps = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (FEATURE_REGEX.test(line) && line.includes(':')) {
      featureName = line.split(':').slice(1).join(':').trim() || featureName;
      continue;
    }

    if (SCENARIO_REGEX.test(line) && line.includes(':')) {
      const scenarioName = line.split(':').slice(1).join(':').trim() || `Escenario ${scenarios.length + 1}`;
      currentScenario = { name: scenarioName, steps: [] };
      scenarios.push(currentScenario);
      continue;
    }

    if (STEP_REGEX.test(line)) {
      if (!currentScenario) {
        currentScenario = { name: `Escenario ${scenarios.length + 1}`, steps: [] };
        scenarios.push(currentScenario);
      }
      currentScenario.steps.push(line);
      totalSteps += 1;
    }
  }

  return {
    featureName: featureName || 'Escenario automatizado',
    scenarios,
    totalSteps
  };
}

function sanitizeProjectName(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'gherkin-project';
}

function createLocatorSuggestion({ name, css, xpath, fallbacks = [], rationale, score = 0.6 }) {
  return {
    name,
    css,
    xpath,
    score: Math.max(0.45, Math.min(0.95, Number(score.toFixed(2)))),
    fallbacks: Array.from(new Set(fallbacks.filter(Boolean))),
    rationale
  };
}

function buildLocatorsFromGherkin(parsed) {
  const suggestions = [];
  const seen = new Set();

  function push(locator) {
    if (!locator || !locator.name) return;
    const key = `${locator.name}|${locator.css}|${locator.xpath}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(locator);
  }

  for (const scenario of parsed.scenarios) {
    for (const step of scenario.steps) {
      const lower = step.toLowerCase();
      if (/(correo|email|usuario|mail)/.test(lower)) {
        push(
          createLocatorSuggestion({
            name: 'inputEmail',
            css: "input[name='email']",
            xpath: "//input[@name='email']",
            fallbacks: ["text=Correo", "text=Email", "xpath=//label[contains(translate(normalize-space(.),'EMAIL','email'),'email')]//input"],
            rationale: `Derivado del paso "${step}" buscando campo de correo.`,
            score: 0.72
          })
        );
      }
      if (/(contraseñ|password|clave)/.test(lower)) {
        push(
          createLocatorSuggestion({
            name: 'inputPassword',
            css: "input[type='password']",
            xpath: "//input[@type='password']",
            fallbacks: ["text=Contraseña", "xpath=//input[contains(@name,'pass')]"],
            rationale: `Derivado del paso "${step}" para el campo de contraseña.`,
            score: 0.7
          })
        );
      }
      if (/(recordar|mantener sesión|mantenerme)/.test(lower)) {
        push(
          createLocatorSuggestion({
            name: 'chkRememberUser',
            css: "input[type='checkbox'][name*='remember']",
            xpath: "//input[@type='checkbox' and contains(@name,'remember')]",
            fallbacks: ["text=Recordar", "xpath=//label[contains(.,'Recordar')]/input"],
            rationale: `Derivado del paso "${step}" para recordar usuario.`,
            score: 0.68
          })
        );
      }
      if (/(iniciar sesión|entrar|acceder|login)/.test(lower)) {
        push(
          createLocatorSuggestion({
            name: 'btnLogin',
            css: "[data-testid='login'], button[type='submit']",
            xpath: "//*[@data-testid='login' or (self::button and @type='submit')]",
            fallbacks: ["text=Iniciar sesión", "role=button name=\"Iniciar sesión\""],
            rationale: `Derivado del paso "${step}" para accionar el login.`,
            score: 0.74
          })
        );
      }
      if (/(dashboard|panel|inicio|home)/.test(lower)) {
        push(
          createLocatorSuggestion({
            name: 'lblDashboardHeading',
            css: "main h1",
            xpath: "//main//h1",
            fallbacks: ["text=Dashboard", "text=Panel", "role=heading name=\"Panel\""],
            rationale: `Derivado del paso "${step}" para validar la pantalla principal.`,
            score: 0.63
          })
        );
      }
      if (/(buscar|search)/.test(lower)) {
        push(
          createLocatorSuggestion({
            name: 'inputSearch',
            css: "input[type='search'], input[name*='search']",
            xpath: "//input[@type='search' or contains(@name,'search')]",
            fallbacks: ["text=Buscar", "aria-label=buscar"],
            rationale: `Derivado del paso "${step}" para el campo de búsqueda.`,
            score: 0.66
          })
        );
      }
      if (/(bot[oó]n|click|clic|presiono|presionar)/.test(lower) && !/(iniciar sesión|login|entrar|acceder)/.test(lower)) {
        push(
          createLocatorSuggestion({
            name: 'btnPrincipal',
            css: "button",
            xpath: "//button",
            fallbacks: ["role=button", "xpath=//button[1]"],
            rationale: `Derivado del paso "${step}" para interactuar con un botón genérico.`,
            score: 0.55
          })
        );
      }
    }
  }

  if (!suggestions.length) {
    push(
      createLocatorSuggestion({
        name: 'elementoPrincipal',
        css: 'body *:first-child',
        xpath: '//*',
        fallbacks: ["xpath=//*"],
        rationale: 'Sugerencia genérica al no identificar elementos específicos en los pasos.',
        score: 0.48
      })
    );
  }

  return ensureUniqueNames(suggestions);
}

function extractHintsFromSelector(selector = '') {
  const hints = { ids: [], attributes: [], classes: [], texts: [] };
  if (!selector) return hints;

  let match;
  const idRegex = /#([a-zA-Z0-9_-]+)/g;
  while ((match = idRegex.exec(selector))) {
    hints.ids.push(match[1]);
  }

  const classRegex = /\.([a-zA-Z0-9_-]+)/g;
  while ((match = classRegex.exec(selector))) {
    hints.classes.push(match[1]);
  }

  const attrRegex = /\[\s*([a-zA-Z0-9:_-]+)\s*=\s*['"]?([^'"\]]+)['"]?\s*\]/g;
  while ((match = attrRegex.exec(selector))) {
    hints.attributes.push({ key: match[1], value: match[2] });
  }

  const xpathAttrRegex = /@([a-zA-Z0-9:_-]+)\s*=\s*['"]([^'"]+)['"]/g;
  while ((match = xpathAttrRegex.exec(selector))) {
    hints.attributes.push({ key: match[1], value: match[2] });
  }

  const textRegex = /text\s*=\s*['"]([^'"]+)['"]/gi;
  while ((match = textRegex.exec(selector))) {
    hints.texts.push(match[1]);
  }

  const containsRegex = /contains\([^,]+,\s*['"]([^'"]+)['"]/gi;
  while ((match = containsRegex.exec(selector))) {
    hints.texts.push(match[1]);
  }

  hints.ids = Array.from(new Set(hints.ids));
  hints.classes = Array.from(new Set(hints.classes));
  hints.texts = Array.from(new Set(hints.texts));

  const attrKey = new Set();
  hints.attributes = hints.attributes.filter(attr => {
    const signature = `${attr.key}:${attr.value}`;
    if (attrKey.has(signature)) return false;
    attrKey.add(signature);
    return true;
  });

  return hints;
}

function mergeHints(failed = {}) {
  const combined = { ids: [], attributes: [], classes: [], texts: [] };
  const selectors = [failed.css, failed.xpath].filter(Boolean);
  for (const selector of selectors) {
    const hints = extractHintsFromSelector(selector);
    combined.ids.push(...hints.ids);
    combined.classes.push(...hints.classes);
    combined.texts.push(...hints.texts);
    combined.attributes.push(...hints.attributes);
  }

  combined.ids = Array.from(new Set(combined.ids));
  combined.classes = Array.from(new Set(combined.classes));
  combined.texts = Array.from(new Set(combined.texts));

  const attrKey = new Set();
  combined.attributes = combined.attributes.filter(attr => {
    const signature = `${attr.key}:${attr.value}`;
    if (attrKey.has(signature)) return false;
    attrKey.add(signature);
    return true;
  });

  return combined;
}

function scoreSelfHealCandidate(candidate, hints) {
  let score = typeof candidate.score === 'number' ? candidate.score : 0.5;
  const haystack = [candidate.css || '', candidate.xpath || '', ...(candidate.fallbacks || [])]
    .join(' ')
    .toLowerCase();

  for (const id of hints.ids) {
    if (!id) continue;
    const token = id.toLowerCase();
    if (haystack.includes(`#${token}`) || haystack.includes(`id='${token}'`) || haystack.includes(`id="${token}"`)) {
      score += 0.18;
    }
  }

  for (const cls of hints.classes) {
    if (!cls) continue;
    const token = cls.toLowerCase();
    if (haystack.includes(`.${token}`) || haystack.includes(`class='${token}'`) || haystack.includes(`class="${token}"`)) {
      score += 0.08;
    }
  }

  for (const attr of hints.attributes) {
    if (!attr || !attr.key) continue;
    const key = attr.key.toLowerCase();
    const value = (attr.value || '').toLowerCase();
    if (!value) continue;
    if (haystack.includes(`${key}='${value}'`) || haystack.includes(`${key}="${value}"`)) {
      score += 0.12;
    }
  }

  for (const text of hints.texts) {
    if (!text) continue;
    if (haystack.includes(text.toLowerCase())) {
      score += 0.1;
    }
  }

  return Math.max(0.1, Math.min(0.99, Number(score.toFixed(2))));
}

function selectSelfHealCandidate(candidates, hints) {
  let best = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const candidateScore = scoreSelfHealCandidate(candidate, hints);
    if (!best || candidateScore > bestScore) {
      best = { ...candidate, score: candidateScore };
      bestScore = candidateScore;
    }
  }
  return best;
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

router.post('/gherkin2code', (req, res) => {
  const { frameworkId, patternId, gherkin } = req.body || {};

  if (!frameworkId) {
    return res.status(400).json({ error: 'frameworkId es obligatorio.' });
  }
  if (!patternId) {
    return res.status(400).json({ error: 'patternId es obligatorio.' });
  }
  if (!gherkin || !gherkin.trim()) {
    return res.status(400).json({ error: 'Debes proporcionar el texto Gherkin.' });
  }

  const parsed = parseGherkinText(gherkin);
  const locators = buildLocatorsFromGherkin(parsed);
  const projectName = sanitizeProjectName(parsed.featureName);

  try {
    const { files, framework, pattern } = generateProject({
      projectName,
      frameworkId,
      patternId,
      locators,
      writeOutput: false
    });

    const fileEntries = Object.entries(files || {}).map(([path, content]) => ({ path, content }));

    return res.json({
      files: fileEntries,
      summary: {
        framework,
        pattern,
        totalScenarios: parsed.scenarios.length,
        totalSteps: parsed.totalSteps
      }
    });
  } catch (error) {
    console.error('Error en /api/gherkin2code', error);
    const message = error.message || 'Error interno al convertir Gherkin a código';
    if (/Template no disponible|El patrón|frameworkId requerido|manifest/i.test(message)) {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});

router.post('/selfheal', (req, res) => {
  const { failed = {}, historyKey } = req.body || {};
  if (!historyKey) {
    return res.status(400).json({ error: 'historyKey requerido para self-healing.' });
  }

  const historyPath = `locators/${historyKey}.json`;
  const stored = readJsonSafe(historyPath, null);
  const hints = mergeHints(failed);

  let patched = null;
  let learned = false;
  let reason = 'No se encontraron candidatos para reemplazar el selector fallido.';

  if (failed.contextHtml) {
    try {
      const candidates = computeLocatorCandidates(failed.contextHtml);
      const selected = selectSelfHealCandidate(candidates, hints);
      if (selected) {
        patched = {
          css: selected.css || null,
          xpath: selected.xpath || null,
          score: selected.score
        };
        reason = 'Selector sugerido heurísticamente y guardado para futuros intentos.';
        saveJson(historyPath, {
          updatedAt: new Date().toISOString(),
          lastFailed: failed,
          suggestion: {
            css: selected.css || null,
            xpath: selected.xpath || null,
            fallbacks: selected.fallbacks || [],
            score: selected.score
          }
        });
        learned = true;
      }
    } catch (error) {
      console.warn('No se pudo analizar contextHtml para self-healing:', error.message);
    }
  }

  if (!patched && stored?.suggestion) {
    patched = {
      css: stored.suggestion.css || null,
      xpath: stored.suggestion.xpath || null,
      score: typeof stored.suggestion.score === 'number' ? Number(stored.suggestion.score) : 0.5
    };
    reason = 'Se reutilizó la sugerencia previamente aprendida para este flujo.';
  }

  res.json({ patched, reason, learned });
});

module.exports = router;
