#!/bin/bash
set -e

echo "🚀 Setting up Superwall Documentation development environment..."

# Ensure we're in the right directory
cd /workspace/docs

# Disable Corepack download prompt
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Verify Yarn version
echo "📦 Checking Yarn version..."
yarn --version

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Copy environment variables if example exists in the root
if [ -f ".env.example" ] && [ ! -f ".env.local" ]; then
    echo "📋 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your actual values"
fi

# Build preparation steps
echo "🔨 Running build preparation steps..."
yarn build:prep || echo "⚠️  Build prep failed - you may need to run this manually"

echo "✅ Development environment setup complete!"
echo ""
echo "📚 Documentation Development Commands:"
echo "  yarn dev          - Start the development server on port 8293"
echo "  yarn build        - Build the documentation site"
echo "  yarn deploy:staging - Deploy to staging environment"
echo "  yarn deploy       - Deploy to production (requires permissions)"
echo ""
echo "📝 Content is located in: /content/docs/"
echo "🌐 Dev server will be available at: http://localhost:8293"