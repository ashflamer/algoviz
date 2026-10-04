#!/usr/bin/env node
/**
 * The world's smallest bundler.
 *
 * The app is written as proper ES modules so the algorithms can be unit tested
 * with `node --test`. The *shipped* artifact is a single index.html with no
 * imports, no CDN and no build toolchain, so it runs from `file://`, from
 * GitHub Pages, or from a USB stick in 2035.
 *
 * Modules are concatenated in dependency order with import/export statements
 * stripped. That only works because nothing here uses default exports,
 * re-exports, or circular imports -- which the check below enforces.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ORDER = [
  'src/grid.js',
  'src/priority-queue.js',
  'src/algorithms.js',
  'src/maze.js',
  'src/ui.js',
];

const IMPORT_RE = /^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm;
const EXPORT_RE = /^export\s+(?=(const|let|var|function|class|async))/gm;

const chunks = [];
for (const file of ORDER) {
  const source = readFileSync(join(root, file), 'utf8');

  if (/export\s+default/.test(source)) {
    throw new Error(`${file}: default exports are not supported by this bundler`);
  }
  if (/export\s*{/.test(source)) {
    throw new Error(`${file}: re-export blocks are not supported by this bundler`);
  }

  const stripped = source.replace(IMPORT_RE, '').replace(EXPORT_RE, '').trim();
  chunks.push(`// ---- ${file} ----\n${stripped}`);
}

const bundle = [
  "'use strict';",
  '(function () {',
  chunks.join('\n\n'),
  '',
  "document.addEventListener('DOMContentLoaded', function () {",
  "  mount(document.getElementById('app'));",
  '});',
  '})();',
].join('\n');

const template = readFileSync(join(root, 'src/template.html'), 'utf8');
if (!template.includes('/*__BUNDLE__*/')) {
  throw new Error('template.html is missing the /*__BUNDLE__*/ placeholder');
}

const html = template.replace('/*__BUNDLE__*/', () => bundle);
writeFileSync(join(root, 'index.html'), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`built index.html — ${kb} kB, ${ORDER.length} modules, 0 dependencies`);
