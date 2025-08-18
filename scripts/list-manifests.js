const fs = require('fs');
const path = require('path');

// Solo ejecutar si LIST_MANIFESTS=1 está presente (evita ruido en CI por defecto)
if (process.env.LIST_MANIFESTS !== '1') {
  // No imprimir nada para builds normales
  process.exit(0);
}

function walk(dir) {
  const out = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const p = path.join(dir, it.name);
      if (it.isDirectory()) out.push(...walk(p));
      else out.push(p);
    }
  } catch (_err) {
    return out;
  }
  return out;
}

const base = path.join(process.cwd(), '.next', 'server', 'app');
console.log('Listing client-reference-manifest files under', base);
const files = walk(base).filter(f => f.includes('client-reference-manifest'));
if (files.length === 0) {
  console.log('No client-reference-manifest files found');
} else {
  for (const f of files) console.log(f);
}
