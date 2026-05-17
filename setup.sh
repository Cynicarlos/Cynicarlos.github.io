#!/bin/bash
# Blog setup script — run on a new computer to get everything ready.
# Usage: bash setup.sh

set -e

echo "=== Blog Setup ==="

# 1. Check Node.js
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install it from https://nodejs.org"
  exit 1
fi
echo "  Node.js: $(node -v)"

# 2. Install dependencies
echo "  Installing npm packages..."
npm install

# 3. Set up .env with GitHub token
if [ ! -f .env ]; then
  echo ""
  echo "GitHub Personal Access Token is needed for deploying to GitHub Pages."
  echo "Generate one at: https://github.com/settings/tokens (scope: repo or public_repo)"
  read -rp "Enter your GitHub token: " token
  echo "GITHUB_TOKEN=$token" > .env
  echo "  .env created."
else
  echo "  .env already exists, skipping."
fi

echo ""
echo "=== Done! ==="
echo ""
echo "Quick start:"
echo "  1. Write a post in Markdown (anywhere)"
echo "  2. npm run publish -- path/to/post.md [--tags \"tag1,tag2\"] [--category \"cat\"]"
echo "  3. Done — your post is live on cynicarlos.github.io"
