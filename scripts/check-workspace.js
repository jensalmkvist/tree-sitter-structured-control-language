#!/usr/bin/env node
// Parse every .scl / .udt / .db / .nvt file of a TIA text workspace (or any
// folder) with this grammar and report what fails.
//
//   node scripts/check-workspace.js <folder> [--files]
//
// Prints the totals per file type and the failing files grouped by where the
// first ERROR / MISSING node sits (its parent node). It never prints file
// contents, so it is safe to run on customer projects; with --files it also
// lists each failing file's path and the error position.
//
// Uses the tree-sitter CLI from node_modules (npm install) and runs it from
// the repository root, so it parses with this checkout's grammar.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const EXTENSIONS = ['.scl', '.udt', '.db', '.nvt'];
const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'node_modules', 'tree-sitter-cli', 'cli.js');

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: node scripts/check-workspace.js <folder> [--files]');
  process.exit(2);
}

const args = process.argv.slice(2);
const listFiles = args.includes('--files');
const folders = args.filter(a => !a.startsWith('--'));
if (folders.length !== 1) usage();
const folder = path.resolve(folders[0]);
if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) usage(`not a folder: ${folder}`);
if (!fs.existsSync(CLI)) usage('tree-sitter CLI not found; run `npm install` in the repository first');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      walk(p, out);
    } else if (EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

function treeSitter(cliArgs) {
  const r = spawnSync(process.execPath, [CLI, ...cliArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  });
  if (r.error) throw r.error;
  return (r.stdout || '') + (r.stderr || '');
}

// The CLI picks this grammar by file extension (tree-sitter.json file-types).
const files = walk(folder, []).sort();
if (files.length === 0) {
  console.log(`no ${EXTENSIONS.join('/')} files under ${folder}`);
  process.exit(0);
}

// One CLI call for all files, with --stat: lines for failing files only.
const listPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'scl-check-')), 'paths.txt');
fs.writeFileSync(listPath, files.join('\n') + '\n');
const statOut = treeSitter(['parse', '--quiet', '--stat', '--paths', listPath]);
fs.rmSync(path.dirname(listPath), { recursive: true, force: true });

const failing = new Map(); // path -> first error position text
for (const line of statOut.split(/\r?\n/)) {
  const m = line.match(/^(.*?)\s+Parse:.*\((ERROR|MISSING)(.*)\)\s*$/);
  if (m) failing.set(path.resolve(ROOT, m[1].trim()), `${m[2]}${m[3]}`);
}
if (!/Total parses:/.test(statOut)) {
  console.error('tree-sitter did not report totals; its output was:');
  console.error(statOut.split(/\r?\n/).slice(0, 20).join('\n'));
  process.exit(2);
}

// Where the first ERROR / MISSING sits, as node names only (no source text).
// ERROR nodes appear in the tree output: report the node that contains the
// first one. MISSING nodes do not, so take the position from the --stat line
// and report the innermost node around it.
function firstProblem(file, problem) {
  const out = treeSitter(['parse', file]);
  const nodes = [];
  for (const raw of out.split(/\r?\n/)) {
    const m = raw.match(/^(\s*)(?:[a-z_]+: )?\(([A-Za-z_]+) \[(\d+), (\d+)\] - \[(\d+), (\d+)\]/);
    if (!m) continue;
    nodes.push({
      depth: m[1].length,
      name: m[2],
      start: [Number(m[3]), Number(m[4])],
      end: [Number(m[5]), Number(m[6])],
    });
  }
  const le = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
  const describe = (stack) => {
    const parent = stack.length ? stack[stack.length - 1].name : '(top)';
    const outer = stack.length > 1 ? ` (inside ${stack[stack.length - 2].name})` : '';
    return `${parent}${outer}`;
  };

  const stack = [];
  if (problem.startsWith('ERROR')) {
    for (const n of nodes) {
      while (stack.length && stack[stack.length - 1].depth >= n.depth) stack.pop();
      if (n.name === 'ERROR') return `ERROR in ${describe(stack)}`;
      stack.push(n);
    }
  } else {
    const m = problem.match(/^(MISSING .*?) \[(\d+), (\d+)\]/);
    if (m) {
      const pos = [Number(m[2]), Number(m[3])];
      let best = [];
      for (const n of nodes) {
        while (stack.length && stack[stack.length - 1].depth >= n.depth) stack.pop();
        stack.push(n);
        if (le(n.start, pos) && le(pos, n.end)) best = stack.slice();
      }
      // A zero-width node at the position is the missing node itself.
      const same = (a, b) => a[0] === b[0] && a[1] === b[1];
      const last = best[best.length - 1];
      if (last && same(last.start, last.end)) best.pop();
      // A missing token after a node belongs to the outermost node that ends
      // there (`#a := 1` is missing the `;` of the statement, not of `1`).
      while (best.length > 1 && same(best[best.length - 2].end, pos)) best.pop();
      return `${m[1]} in ${describe(best)}`;
    }
  }
  return `${problem.split(' [')[0]} (position not found in tree output)`;
}

const byExt = new Map();
for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  const e = byExt.get(ext) || { total: 0, failed: 0 };
  e.total += 1;
  if (failing.has(f)) e.failed += 1;
  byExt.set(ext, e);
}

const groups = new Map();
for (const f of failing.keys()) {
  const key = firstProblem(f, failing.get(f));
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(f);
}

const ok = files.length - failing.size;
console.log(`folder: ${folder}`);
console.log(`parsed: ${ok} / ${files.length} (${((100 * ok) / files.length).toFixed(1)} %), failed: ${failing.size}`);
for (const [ext, e] of [...byExt.entries()].sort()) {
  console.log(`  ${ext.padEnd(5)} ${String(e.total - e.failed).padStart(5)} / ${String(e.total).padEnd(5)} failed ${e.failed}`);
}
if (groups.size) {
  console.log('\nfailing files by first error:');
  for (const [key, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const exts = {};
    for (const f of list) exts[path.extname(f).toLowerCase()] = (exts[path.extname(f).toLowerCase()] || 0) + 1;
    const extText = Object.entries(exts).map(([x, n]) => `${x} ${n}`).join(', ');
    console.log(`  ${String(list.length).padStart(4)}  ${key}   [${extText}]`);
    if (listFiles) {
      for (const f of list) console.log(`          ${path.relative(folder, f)}  ${failing.get(f)}`);
    }
  }
}
process.exit(failing.size ? 1 : 0);
