// Minimal Express server for LogicTest Studio (Demo)
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const { TEMPLATES, generateProject } = require('./services/codegenService');
const aiRoutes = require('./aiRoutes');

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
    const { outDir, files, framework, pattern } = generateProject({
      projectName,
      frameworkId,
      patternId,
      locators,
      writeOutput: true
    });

    return res.json({
      outDir,
      files: Object.keys(files),
      framework,
      pattern
    });
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
