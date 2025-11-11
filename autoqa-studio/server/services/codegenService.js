const fs = require('fs');
const path = require('path');

const { TEMPLATES, resolveTemplateEntry } = require('../config/templates');
const { render, writeTree } = require('../utils/templateRenderer');

function ensureFramework(frameworkId) {
  const frameworkEntry = resolveTemplateEntry(TEMPLATES.frameworks, frameworkId);
  if (!frameworkEntry) {
    throw new Error(`Template no disponible para ${frameworkId}`);
  }
  const baseDir = path.join(__dirname, '..', 'templates', frameworkEntry.id);
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Template no disponible para ${frameworkEntry.name}`);
  }
  return { frameworkEntry, baseDir };
}

function ensurePattern(baseDir, patternId, frameworkEntry) {
  if (!patternId) {
    return {
      patternEntry: { id: 'default', name: 'Default' },
      manifestDir: baseDir
    };
  }

  const patternEntry = resolveTemplateEntry(TEMPLATES.patterns, patternId);
  if (!patternEntry) {
    throw new Error(`El patrón ${patternId} no está disponible para ${frameworkEntry.name}`);
  }

  const candidateDir = path.join(baseDir, patternEntry.id);
  if (!fs.existsSync(candidateDir)) {
    throw new Error(`El patrón ${patternId} no está disponible para ${frameworkEntry.name}`);
  }

  return { patternEntry, manifestDir: candidateDir };
}

function loadManifest(manifestDir, frameworkId, patternId) {
  const manifestPath = path.join(manifestDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json faltante en template ${frameworkId}/${patternId}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`manifest.json inválido en ${frameworkId}/${patternId}`);
  }

  for (const file of manifest.files) {
    const src = path.join(manifestDir, file.src);
    if (!fs.existsSync(src)) {
      throw new Error(`Archivo de plantilla faltante: ${file.src}`);
    }
  }

  return { manifest, manifestDir };
}

function buildData({
  projectName,
  frameworkEntry,
  patternEntry,
  locators
}) {
  const locatorsList = Array.isArray(locators) ? locators : [];
  const locatorsMap = Object.fromEntries(locatorsList.map(locator => [locator.name, locator]));
  const formattedMap = JSON.stringify(locatorsMap, null, 2);
  const formattedList = JSON.stringify(locatorsList, null, 2);
  const locatorSummary = locatorsList
    .map(locator => `- ${locator.name} → ${locator.css || locator.xpath || ''}`)
    .join('\n');

  return {
    projectName,
    frameworkId: frameworkEntry.id,
    frameworkName: frameworkEntry.name,
    patternId: patternEntry.id,
    patternName: patternEntry.name,
    locatorsJson: formattedMap,
    locatorsArrayJson: formattedList,
    locatorSummary
  };
}

function renderManifestFiles(manifest, manifestDir, data) {
  const files = {};
  for (const file of manifest.files) {
    const sourcePath = path.join(manifestDir, file.src);
    const rawTemplate = fs.readFileSync(sourcePath, 'utf8');
    files[file.dst] = render(rawTemplate, data);
  }
  return files;
}

function generateProject({
  projectName = 'logictest-project',
  frameworkId,
  patternId,
  locators = [],
  writeOutput = true
}) {
  if (!frameworkId) {
    throw new Error('frameworkId requerido');
  }

  const { frameworkEntry, baseDir } = ensureFramework(frameworkId);
  const { patternEntry, manifestDir } = ensurePattern(baseDir, patternId, frameworkEntry);
  const { manifest } = loadManifest(manifestDir, frameworkEntry.id, patternEntry.id);

  const data = buildData({ projectName, frameworkEntry, patternEntry, locators });
  const files = renderManifestFiles(manifest, manifestDir, data);

  let outDir = null;
  if (writeOutput) {
    outDir = path.join(__dirname, '..', '..', 'generated', `${projectName}-${Date.now()}`);
    fs.mkdirSync(outDir, { recursive: true });
    writeTree(outDir, files);
  }

  return {
    outDir,
    files,
    framework: frameworkEntry.name,
    pattern: patternEntry.name,
    manifest,
    data
  };
}

module.exports = {
  TEMPLATES,
  generateProject
};
