const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---- parse CLI args ----
const args = process.argv.slice(2);
const fileArg = args.find(a => !a.startsWith('--'));
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
};
const tags = getArg('tags');
const category = getArg('category');

if (!fileArg) {
  console.log('Usage: node scripts/publish.js <file.md> [--tags "t1,t2"] [--category "cat"]');
  process.exit(1);
}

// ---- load .env ----
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .forEach(l => {
      const [k, ...v] = l.split('=');
      process.env[k.trim()] = v.join('=').trim();
    });
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Missing GITHUB_TOKEN in .env file');
  process.exit(1);
}

// ---- read & process the post ----
const srcPath = path.resolve(fileArg);
if (!fs.existsSync(srcPath)) {
  console.error(`File not found: ${srcPath}`);
  process.exit(1);
}

let content = fs.readFileSync(srcPath, 'utf-8');
const title = path.basename(srcPath, '.md').replace(/[-_]/g, ' ');

// auto-generate frontmatter if missing
if (!content.trimStart().startsWith('---')) {
  const date = new Date().toISOString().split('T')[0];
  const tagList = tags ? `\n    - ${tags.split(',').map(t => t.trim()).join('\n    - ')}` : '';
  const categoryLine = category ? `\ncategory: ${category}` : '';

  const frontmatter = `---
title: ${title}
date: ${date}${categoryLine}
tags:${tagList || ' []'}
---\n\n`;

  content = frontmatter + content.trim();
  console.log(`  Auto-generated frontmatter for "${title}"`);
}

// ---- write to source/_posts ----
const postsDir = path.join(__dirname, '..', 'source', '_posts');
const destName = path.basename(srcPath);
const destPath = path.join(postsDir, destName);
fs.writeFileSync(destPath, content, 'utf-8');
console.log(`  Written: source/_posts/${destName}`);

// ---- inject token into deploy config & run hexo ----
const configPath = path.join(__dirname, '..', '_config.yml');
const originalConfig = fs.readFileSync(configPath, 'utf-8');
const patchedConfig = originalConfig.replace(
  /token:\s*GITHUB_TOKEN_PLACEHOLDER/,
  `token: ${token}`
);
fs.writeFileSync(configPath, patchedConfig, 'utf-8');

try {
  console.log('  Generating...');
  execSync('npx hexo generate', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log('  Deploying...');
  execSync('npx hexo deploy', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log(`\nDone! ${title} published.`);
} finally {
  // always restore placeholder
  fs.writeFileSync(configPath, originalConfig, 'utf-8');
}
