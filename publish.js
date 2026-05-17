const fs = require('fs');
const path = require('path');

// ---- parse CLI args ----
const args = process.argv.slice(2);
const fileArg = args.find(a => !a.startsWith('--'));
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
};
const tags = getArg('tags');
const category = getArg('category');
const mathjax = args.includes('--mathjax');

if (!fileArg) {
  console.log('Usage: node publish.js <file.md> [--tags "t1,t2"] [--category "cat"] [--mathjax]');
  process.exit(1);
}

// ---- read & process the post ----
const rootDir = __dirname;
const srcPath = path.resolve(fileArg);
if (!fs.existsSync(srcPath)) {
  console.error(`File not found: ${srcPath}`);
  process.exit(1);
}

let content = fs.readFileSync(srcPath, 'utf-8');
const title = path.basename(srcPath, '.md').replace(/[-_]/g, ' ');

// auto-generate frontmatter if missing
if (!content.trimStart().startsWith('---')) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const tagList = tags ? `\n    - ${tags.split(',').map(t => t.trim()).join('\n    - ')}` : '';
  const categoryLine = category ? `\ncategory: ${category}` : '';
  const mathjaxLine = mathjax ? '\nmathjax: true' : '';

  const frontmatter = `---
title: ${title}
date: ${date}${categoryLine}${mathjaxLine}
tags:${tagList || ' []'}
---\n\n`;

  content = frontmatter + content.trim();
  console.log(`  Auto-generated frontmatter for "${title}"`);
}

// ---- write to source/_posts ----
const postsDir = path.join(rootDir, 'source', '_posts');
const destName = path.basename(srcPath);
const destPath = path.join(postsDir, destName);
fs.writeFileSync(destPath, content, 'utf-8');
console.log(`  Written: source/_posts/${destName}`);

// ---- generate & deploy ----
async function run() {
  const Hexo = require('hexo');
  const hexo = new Hexo(rootDir, { silent: false });

  try {
    await hexo.init();

    console.log('  Generating...');
    await hexo.call('generate', {});

    console.log('  Deploying...');
    await hexo.call('deploy', {});

    console.log(`\nDone! "${title}" published.`);
  } finally {
    await hexo.exit();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
