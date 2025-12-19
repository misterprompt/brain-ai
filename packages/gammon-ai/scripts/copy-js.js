const fs = require('fs');
const path = require('path');

const filesToCopy = [
  'cache-service.js',
  'backgammon-coach.js',
  'language-manager.js'
];

const utilsFilesToCopy = [
  path.join('utils', 'logger.js')
];

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function copyFile(source, destination) {
  ensureDirectoryExists(path.dirname(destination));
  fs.copyFileSync(source, destination);
  console.log(`Copied ${source} -> ${destination}`);
}

filesToCopy.forEach((file) => {
  const srcPath = path.join(srcDir, file);
  const distPath = path.join(distDir, file);
  if (fs.existsSync(srcPath)) {
    copyFile(srcPath, distPath);
  } else {
    console.warn(`File not found: ${srcPath}`);
  }
});

utilsFilesToCopy.forEach((file) => {
  const srcPath = path.join(srcDir, file);
  const distPath = path.join(distDir, file);
  if (fs.existsSync(srcPath)) {
    copyFile(srcPath, distPath);
  } else {
    console.warn(`File not found: ${srcPath}`);
  }
});
