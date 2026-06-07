#!/usr/bin/env node
/**
 * build-docs.mjs — Generate static HTML documentation from the project's Markdown files.
 *
 * Converts every root-level *.md file into a styled, self-contained .html page under docs/,
 * plus a docs/index.html landing page. Intra-doc links (foo.md) are rewritten to foo.html so
 * the generated site is browsable offline.
 *
 * Run inside Docker:  docker compose run --rm app npm run docs
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs');

marked.setOptions({ gfm: true, breaks: false });

// Friendly titles for the index; falls back to the filename for anything not listed.
const TITLES = {
  'README': 'Overview',
  'RUNBOOK': 'Runbook — Running in Docker',
  'AGENTS': 'Agent / Contributor Guide',
  'CLAUDE': 'Claude Code Pointer',
  'memory': 'Project Memory',
  'aiops-platform-design': 'Platform Design',
};

const STYLE = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.65; color: #1f2328; background: #ffffff;
}
.wrap { max-width: 860px; margin: 0 auto; padding: 2.5rem 1.25rem 5rem; }
.topbar { font-size: .85rem; margin-bottom: 2rem; }
.topbar a { color: #6366f1; text-decoration: none; }
.topbar a:hover { text-decoration: underline; }
h1, h2, h3, h4 { line-height: 1.25; font-weight: 600; margin-top: 1.8em; margin-bottom: .6em; }
h1 { font-size: 2rem; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; margin-top: 0; }
h2 { font-size: 1.45rem; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
h3 { font-size: 1.2rem; }
p, ul, ol, table, blockquote, pre { margin: 0 0 1rem; }
a { color: #6366f1; }
code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace; font-size: .88em;
  background: rgba(99,102,241,.1); padding: .15em .4em; border-radius: 6px;
}
pre {
  background: #0d1117; color: #e6edf3; padding: 1rem 1.15rem; border-radius: 10px;
  overflow-x: auto; font-size: .85rem; line-height: 1.5;
}
pre code { background: none; padding: 0; font-size: inherit; color: inherit; }
blockquote {
  border-left: 4px solid #6366f1; background: rgba(99,102,241,.06);
  margin-left: 0; padding: .5rem 1rem; color: #4b5563; border-radius: 0 8px 8px 0;
}
table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
th, td { border: 1px solid #d0d7de; padding: .5rem .75rem; text-align: left; }
th { background: rgba(99,102,241,.08); font-weight: 600; }
tr:nth-child(even) td { background: rgba(0,0,0,.02); }
hr { border: none; border-top: 1px solid #d0d7de; margin: 2rem 0; }
img { max-width: 100%; }
ul.doc-index { list-style: none; padding: 0; }
ul.doc-index li { margin: 0 0 .75rem; }
ul.doc-index a { font-size: 1.1rem; font-weight: 600; text-decoration: none; }
ul.doc-index .file { color: #6b7280; font-weight: 400; font-size: .85rem; margin-left: .5rem; }
footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #d0d7de; color: #6b7280; font-size: .8rem; }
@media (prefers-color-scheme: dark) {
  body { color: #e6edf3; background: #0a0a0a; }
  h1, h2, hr { border-color: #30363d; }
  th, td { border-color: #30363d; }
  th { background: rgba(99,102,241,.15); }
  tr:nth-child(even) td { background: rgba(255,255,255,.03); }
  blockquote { color: #9ca3af; }
  .topbar a, a { color: #818cf8; }
  footer { border-color: #30363d; color: #9ca3af; }
}
`;

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Rewrite links to sibling markdown docs so they point at the generated HTML.
const rewriteLinks = (html) =>
  html.replace(/href="(\.\/)?([\w.-]+)\.md(#[^"]*)?"/g, 'href="$2.html$3"');

const page = (title, bodyHtml, { isIndex = false } = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · AIOps Platform Docs</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
${isIndex ? '' : '<nav class="topbar"><a href="index.html">← All docs</a></nav>'}
${bodyHtml}
<footer>Generated from Markdown by <code>scripts/build-docs.mjs</code> — run <code>docker compose run --rm app npm run docs</code> to rebuild.</footer>
</div>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });

const mdFiles = readdirSync(root)
  .filter((f) => f.toLowerCase().endsWith('.md'))
  .sort();

const generated = [];
for (const file of mdFiles) {
  const name = file.replace(/\.md$/i, '');
  const md = readFileSync(join(root, file), 'utf8');
  const title = TITLES[name] ?? name;
  const bodyHtml = rewriteLinks(marked.parse(md));
  writeFileSync(join(outDir, `${name}.html`), page(title, bodyHtml));
  generated.push({ name, file, title });
  console.log(`  ✓ ${file} → docs/${name}.html`);
}

// Landing page.
const indexBody = `<h1>AIOps Platform — Documentation</h1>
<p>HTML rendering of the project's Markdown docs. Regenerate with <code>docker compose run --rm app npm run docs</code>.</p>
<ul class="doc-index">
${generated
  .map(
    (d) =>
      `<li><a href="${d.name}.html">${escapeHtml(d.title)}</a><span class="file">${d.file}</span></li>`
  )
  .join('\n')}
</ul>`;
writeFileSync(join(outDir, 'index.html'), page('Documentation', indexBody, { isIndex: true }));
console.log(`  ✓ docs/index.html (${generated.length} docs)`);
