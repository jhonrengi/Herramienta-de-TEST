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

module.exports = {
  TEMPLATES,
  resolveTemplateEntry
};
