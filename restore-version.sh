#!/bin/bash
# Script to restore the correct version from GitHub
# Run this if you see version 1.7.5 instead of 2.0.0

echo "🔄 Fetching latest from GitHub..."
git fetch origin

echo "🔄 Resetting to origin/dev..."
git reset --hard origin/dev

echo "✅ Version restored!"
echo ""
echo "📄 Current version:"
head -3 app/page.tsx | grep "Version:"

echo ""
echo "📊 File line count:"
wc -l app/page.tsx

echo ""
echo "🚀 Starting dev server..."
npm run dev
