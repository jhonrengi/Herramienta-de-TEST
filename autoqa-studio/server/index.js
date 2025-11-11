// Minimal Express server for LogicTest Studio (Demo)
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const { TEMPLATES, generateProject } = require('./services/codegenService');
const aiRoutes = require('./aiRoutes');

function normalizeKey(value) {
  return (value || '').toString().trim().toLowerCase();
}

function resolveTemplateEntry(entries, requested) {
  if (!requested) return null;
  const byId = entries.find(entry => entry.id === requested);
  if (byId) {
    return byId;
  }
  const normalized = normalizeKey(requested);
  return entries.find(entry => normalizeKey(entry.name) === normalized) || null;
}

app.get('/api/templates', (_req, res) => res.json(TEMPLATES));
app.use('/api', aiRoutes);

app.post('/api/locators/extract', (req, res) => {
  const { url } = req.body || {};
  const sample = [
    { name: 'btn_login', css: '#login', xpath: '//*[@id="login"]', score: 0.92 },
    { name: 'input_email', css: 'input[name="email"]', xpath: '//input[@name="email"]', score: 0.88 },
    { name: 'input_password', css: 'input[type="password"]', xpath: '//input[@type="password"]', score: 0.86 }
  ];
  res.json({ source: url ? { type: 'url', url } : { type: 'html' }, locators: sample });
});

app.post('/api/codegen', (req, res) => {
  const { projectName = 'logictest-project', frameworkId, patternId, locators = [] } = req.body || {};

  try {
    const { projectName = 'logictest-project', frameworkId, patternId, locators = [] } = req.body || {};
    if (!frameworkId) {
      return res.status(400).json({ error: 'frameworkId requerido' });
    }

    const frameworkEntry = resolveTemplateEntry(TEMPLATES.frameworks, frameworkId);
    if (!frameworkEntry) {
      return res.status(400).json({ error: `Template no disponible para ${frameworkId}` });
    }

    const baseDir = path.join(__dirname, 'templates', frameworkEntry.id);
    if (!fs.existsSync(baseDir)) {
      return res.status(400).json({ error: `Template no disponible para ${frameworkEntry.name}` });
    }

    const patternEntry = resolveTemplateEntry(TEMPLATES.patterns, patternId);
    if (patternId && !patternEntry) {
      return res.status(400).json({ error: `El patrón ${patternId} no está disponible para ${frameworkEntry.name}` });
    }

    const framework = frameworkEntry;

    const pattern = patternEntry || (patternId
      ? { id: patternId, name: patternId }
      : { id: 'default', name: 'Default' });

    const candidateDir = patternEntry ? path.join(baseDir, patternEntry.id) : baseDir;
    if (patternEntry && !fs.existsSync(candidateDir)) {
      return res.status(400).json({ error: `El patrón ${patternId} no está disponible para ${framework.name}` });
    }

    const manifestDir = fs.existsSync(candidateDir) ? candidateDir : baseDir;
    const manifestPath = path.join(manifestDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return res.status(500).json({ error: `manifest.json faltante en template ${framework.id}/${pattern.id}` });
    }

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      return res.status(500).json({ error: `manifest.json inválido en ${framework.id}/${pattern.id}` });
    }

    for (const file of manifest.files) {
      const src = path.join(manifestDir, file.src);
      if (!fs.existsSync(src)) {
        return res.status(500).json({ error: `Archivo de plantilla faltante: ${file.src}` });
      }
    }

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
      frameworkId: framework.id,
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

    return res.json({ outDir: outRoot, files: Object.keys(files), framework: framework.name, pattern: pattern.name });
  } catch (error) {
    console.error('Error generando proyecto', error);
    const message = error.message || 'Error interno al generar el proyecto';
    if (/Template no disponible|El patrón|frameworkId requerido/i.test(message)) {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
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
