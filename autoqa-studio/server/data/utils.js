const fs = require('fs');
const path = require('path');

const DATA_ROOT = path.join(__dirname);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolvePath(relativePath) {
  const target = path.join(DATA_ROOT, relativePath);
  ensureDir(path.dirname(target));
  return target;
}

function saveJson(relativePath, payload) {
  const target = resolvePath(relativePath);
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8');
}

function readJsonSafe(relativePath, fallback = null) {
  try {
    const target = path.join(DATA_ROOT, relativePath);
    if (!fs.existsSync(target)) {
      return fallback;
    }
    const raw = fs.readFileSync(target, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  saveJson,
  readJsonSafe
};
