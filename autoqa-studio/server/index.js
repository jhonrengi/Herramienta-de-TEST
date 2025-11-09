// Minimal Express server for LogicTest Studio (Demo)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

const TEMPLATES = {
  frameworks: [
    { id: 'playwright-ts', name: 'Playwright + TypeScript' },
    { id: 'cypress-js', name: 'Cypress + JavaScript' },
    { id: 'selenium-java-serenity', name: 'Selenium + Serenity BDD (Java)' },
    { id: 'selenium-python', name: 'Selenium + Python' }
  ],
  patterns: [
    { id: 'pom', name: 'Page Object Model' },
    { id: 'screenplay', name: 'Screenplay' },
    { id: 'none', name: 'Sin patrón' }
  ]
};

app.get('/api/templates', (_req, res) => res.json(TEMPLATES));

app.post('/api/locators/extract', (req, res) => {
  const { url } = req.body || {};
  const sample = [
    { name: 'btn_login', css: '#login', xpath: '//*[@id="login"]', score: 0.92 },
    { name: 'input_email', css: 'input[name="email"]', xpath: '//input[@name="email"]', score: 0.88 },
    { name: 'input_password', css: 'input[type="password"]', xpath: '//input[@type="password"]', score: 0.86 }
  ];
  res.json({ source: url ? { type: 'url', url } : { type: 'html' }, locators: sample });
});

function render(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
}

function writeTree(root, files) {
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }
}

app.post('/api/codegen', (req, res) => {
  const { projectName = 'logictest-project', frameworkId, patternId, locators = [] } = req.body || {};
  if (!frameworkId) return res.status(400).json({ error: 'frameworkId requerido' });

  const baseDir = path.join(__dirname, 'templates', frameworkId);
  if (!fs.existsSync(baseDir)) return res.status(400).json({ error: 'Template no disponible' });

  const framework = TEMPLATES.frameworks.find(f => f.id === frameworkId) || { id: frameworkId, name: frameworkId };
  const pattern = TEMPLATES.patterns.find(p => p.id === patternId) || { id: patternId || 'default', name: patternId || 'Default' };

  const candidateDir = patternId ? path.join(baseDir, patternId) : baseDir;
  const manifestDir = fs.existsSync(candidateDir) ? candidateDir : baseDir;

  const manifestPath = path.join(manifestDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return res.status(500).json({ error: 'manifest.json faltante en template' });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const outRoot = path.join(__dirname, '..', 'generated', `${projectName}-${Date.now()}`);
  fs.mkdirSync(outRoot, { recursive: true });

  const locatorsMap = Object.fromEntries((locators || []).map(locator => [locator.name, locator]));
  const formattedMap = JSON.stringify(locatorsMap, null, 2);
  const formattedList = JSON.stringify(locators, null, 2);
  const locatorSummary = (locators || [])
    .map(l => `- ${l.name} → ${l.css || l.xpath || ''}`)
    .join('\n');

  const data = {
    projectName,
    frameworkId,
    frameworkName: framework.name,
    patternId: pattern.id,
    patternName: pattern.name,
    locatorsJson: formattedMap,
    locatorsArrayJson: formattedList,
    locatorSummary
  };

  const files = {};
  for (const file of manifest.files) {
    const src = path.join(manifestDir, file.src);
    const dst = file.dst;
    const raw = fs.readFileSync(src, 'utf8');
    files[dst] = render(raw, data);
  }
  writeTree(outRoot, files);

  res.json({ outDir: outRoot, files: Object.keys(files), framework: framework.name, pattern: pattern.name });
});

app.post('/api/run', (req, res) => {
  const { outDir } = req.body || {};
  res.json({
    status: 'completed',
    summary: { total: 3, passed: 3, failed: 0, durationSec: 7 },
    artifacts: [{ name: 'report.html', path: (outDir || '') + '/report.html' }]
  });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log('LogicTest server running on :' + PORT));
