#!/usr/bin/env node
/* ============================================================
   bump-version.mjs — incrémente les marqueurs de version
   ------------------------------------------------------------
   À LANCER AVANT CHAQUE DÉPLOIEMENT. Met à jour, en une commande,
   les DEUX marqueurs de chaque programme (sinon le bandeau
   « mise à jour » risque de ne pas s'afficher) :

     • CACHE_VERSION              dans sw-<prog>.js
     • <meta name="app-build">    dans programme-<prog>.html

   La nouvelle valeur est un horodatage unique « prog-AAAAMMJJ-hhmmss »,
   donc toujours différente de la précédente → mise à jour détectée.

   Usage (PowerShell ou bash) :
     node bump-version.mjs              # bump Sarah + Alex
     node bump-version.mjs sarah        # bump Sarah seulement
     node bump-version.mjs alex         # bump Alex seulement
     node bump-version.mjs --dry        # aperçu sans rien écrire
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));

// Chaque programme → ses deux fichiers à versionner.
const TARGETS = {
  sarah: { html: 'programme-sarah.html', sw: 'sw-sarah.js' },
  alex:  { html: 'programme-Alex.html',  sw: 'sw-alex.js'  },
};

// ---- Args ----
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const wanted = args.filter(a => !a.startsWith('--')).map(a => a.toLowerCase());
const names = wanted.length ? wanted : Object.keys(TARGETS);

const unknown = names.filter(n => !TARGETS[n]);
if (unknown.length) {
  console.error(`✗ Programme(s) inconnu(s) : ${unknown.join(', ')}`);
  console.error(`  Valeurs possibles : ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

// ---- Horodatage unique : AAAAMMJJ-hhmmss (heure locale) ----
const d = new Date();
const p = (n, l = 2) => String(n).padStart(l, '0');
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
            + `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;

// Remplace UNE occurrence et vérifie qu'elle a bien eu lieu.
function replaceOnce(file, label, regex, replacement) {
  const path = join(ROOT, file);
  const src = readFileSync(path, 'utf8');
  const before = src.match(regex);
  if (!before) {
    throw new Error(`marqueur introuvable (${label}) dans ${file}`);
  }
  const out = src.replace(regex, replacement);
  if (!dry) writeFileSync(path, out, 'utf8');
  return before[1]; // ancienne valeur capturée
}

let okAll = true;
for (const name of names) {
  const { html, sw } = TARGETS[name];
  const version = `${name}-${stamp}`;
  try {
    const oldCache = replaceOnce(
      sw, 'CACHE_VERSION',
      /const CACHE_VERSION = '([^']*)';/,
      `const CACHE_VERSION = '${version}';`
    );
    const oldBuild = replaceOnce(
      html, 'app-build',
      /<meta name="app-build" content="([^"]*)">/,
      `<meta name="app-build" content="${version}">`
    );
    console.log(`✓ ${name}`);
    console.log(`    ${sw.padEnd(14)} CACHE_VERSION : ${oldCache}  →  ${version}`);
    console.log(`    ${html.padEnd(14)} app-build     : ${oldBuild}  →  ${version}`);
  } catch (e) {
    okAll = false;
    console.error(`✗ ${name} : ${e.message}`);
  }
}

console.log(dry
  ? '\n(--dry : aucun fichier modifié)'
  : '\nFait. Pense à committer + pousser pour déclencher le déploiement.');

process.exit(okAll ? 0 : 1);
