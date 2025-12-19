const fs = require('fs');
const path = require('path');

const routerTargetPath = path.join(__dirname, '..', 'node_modules', 'express', 'lib', 'router', 'index.js');
const routerFallbackPath = path.join(__dirname, '..', 'vendor', 'express-router', 'index.js');

if (fs.existsSync(routerTargetPath)) {
  process.exit(0);
}

if (!fs.existsSync(routerFallbackPath)) {
  console.error('[ensure-express-router] Fallback router missing:', routerFallbackPath);
  process.exit(1);
}

fs.mkdirSync(path.dirname(routerTargetPath), { recursive: true });
fs.copyFileSync(routerFallbackPath, routerTargetPath);
console.warn('[ensure-express-router] Injected vendored Express router.');
