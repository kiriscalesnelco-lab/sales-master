#!/bin/bash
# Quick Railway.app Deployment Setup Script

set -e

echo "🚀 Railway.app POS System Deployment Setup"
echo "==========================================="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git config user.name "POS System Admin"
    git config user.email "admin@pos-system.local"
    git add .
    git commit -m "Initial commit: POS System"
    echo "✅ Git initialized"
    echo ""
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not found. Install it:"
    echo ""
    echo "  macOS/Linux:"
    echo "    curl -fsSL https://railway.app/install.sh | bash"
    echo ""
    echo "  Windows (PowerShell):"
    echo "    iwr https://railway.app/install.ps1 -useb | iex"
    echo ""
    read -p "Press Enter after installing Railway CLI..."
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env created (update with your values)"
    echo ""
fi

echo "📋 Configuration Files Ready:"
echo "  ✓ Dockerfile - Multi-stage build"
echo "  ✓ docker-compose.yml - Local testing"
echo "  ✓ railway.json - Railway configuration"
echo "  ✓ .env.example - Environment template"
echo "  ✓ .dockerignore - Docker build optimization"
echo ""

echo "🧪 Next Steps:"
echo ""
echo "1️⃣  Test locally (optional):"
echo "   docker-compose up --build"
echo ""
echo "2️⃣  Connect to Railway:"
echo "   railway link"
echo ""
echo "3️⃣  Deploy:"
echo "   railway up"
echo ""
echo "4️⃣  View deployment:"
echo "   railway open"
echo ""
echo "📖 For detailed instructions, see: DEPLOYMENT_GUIDE.md"
echo ""
echo "✅ Setup complete! Ready to deploy to Railway 🎉"
