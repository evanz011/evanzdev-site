/*
 * Builds a single self-contained HTML file: no assets folder, no server.
 * Every image and every downloadable model is inlined as a base64 data: URI,
 * so the page can be opened from anywhere (or emailed) and the download
 * buttons still hand over real files.
 *
 *   node build-standalone.js
 *
 * NOTE: inlining the models means they are embedded in the page source in
 * plain base64. That is fine for a demo you are clicking through yourself.
 * It is NOT a way to sell them — anyone with the file has every model.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'evanzdev-store-standalone.html');

const MIME = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.rbxm': 'application/octet-stream',
    '.rbxl': 'application/octet-stream',
};

const inlined = [];

function toDataUri(relPath) {
    const file = path.join(ROOT, relPath);
    const buf = fs.readFileSync(file);
    const mime = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    inlined.push({ relPath, bytes: buf.length });
    return `data:${mime};base64,${buf.toString('base64')}`;
}

let html = fs.readFileSync(SRC, 'utf8');

// swap every asset reference for its inline payload
html = html.replace(/(image|file): '(assets\/[^']+)'/g,
    (m, key, relPath) => `${key}: '${toDataUri(relPath)}'`);

// the Google Fonts <link> is the last external dependency. Leave it: the page
// still works offline (it falls back to the stack in --font-pixel/--font-body),
// and inlining two font families would add ~200KB for little gain.

fs.writeFileSync(OUT, html);

const srcSize = fs.statSync(SRC).size;
const outSize = fs.statSync(OUT).size;

console.log('inlined ' + inlined.length + ' assets:');
for (const a of inlined) {
    console.log('  ' + a.relPath.padEnd(38) + (a.bytes / 1024).toFixed(1).padStart(7) + ' KB');
}
console.log('');
console.log('index.html                  ' + (srcSize / 1024).toFixed(1).padStart(8) + ' KB');
console.log('evanzdev-store-standalone   ' + (outSize / 1024).toFixed(1).padStart(8) + ' KB');

const leftovers = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(m => m[1]);
if (leftovers.length) {
    console.log('\nWARNING — still references external files: ' + leftovers.join(', '));
    process.exit(1);
}
console.log('\nno remaining references to assets/ — file is self-contained');
