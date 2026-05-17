#!/bin/bash
# Blog setup script — run on a new computer to get everything ready.
#
# First-time setup:
#   git clone -b source https://github.com/Cynicarlos/Cynicarlos.github.io.git blog
#   cd blog
#   bash setup.sh

set -e

echo "=== Blog Setup ==="

# 0. Ensure we're on the source branch
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$current_branch" != "source" ]; then
  echo "  Switching to source branch..."
  git checkout source 2>/dev/null || git checkout -b source origin/source 2>/dev/null || true
fi

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
