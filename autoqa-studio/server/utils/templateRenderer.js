const fs = require('fs');
const path = require('path');

function render(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (data[key] ?? ''));
}

function writeTree(root, files) {
  for (const [relative, contents] of Object.entries(files)) {
    const fullPath = path.join(root, relative);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents);
  }
}

module.exports = {
  render,
  writeTree
};
