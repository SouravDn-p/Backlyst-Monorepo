const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const srcMainPath = path.join(distDir, 'src', 'main.js');
const shimPath = path.join(distDir, 'main.js');

if (!fs.existsSync(distDir) || !fs.existsSync(srcMainPath)) {
  process.exit(0);
}

const shimSource = "require('./src/main.js');\n";
fs.writeFileSync(shimPath, shimSource, 'utf8');
console.log(`Created dist shim at ${shimPath}`);
