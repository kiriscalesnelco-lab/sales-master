#!/bin/bash
# Railway Deployment Verification Script
# Checks all critical deployment components before pushing to Railway

set -e

echo "🔍 Railway Deployment Verification"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing"
        return 1
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 not found"
        return 1
    fi
}

# Check Node.js and pnpm
echo ""
echo "📦 Checking tools..."
check_command node || exit 1
check_command pnpm || exit 1

# Check critical files
echo ""
echo "📋 Checking configuration files..."
check_file "Dockerfile" || exit 1
check_file "railway.json" || exit 1
check_file "docker-compose.yml" || exit 1
check_file ".env.example" || exit 1
check_file ".railwayignore" || exit 1
check_file "pnpm-workspace.yaml" || exit 1
check_file "pnpm-lock.yaml" || exit 1

# Check build configurations
echo ""
echo "🏗️ Checking build configs..."
check_file "artifacts/api-server/package.json" || exit 1
check_file "artifacts/api-server/tsconfig.json" || exit 1
check_file "artifacts/pos-system/package.json" || exit 1
check_file "artifacts/pos-system/tsconfig.json" || exit 1

# Check health endpoint exists
echo ""
echo "🏥 Checking health endpoint configuration..."
if grep -q "app.get(\"/health\"" "artifacts/api-server/src/app.ts"; then
    echo -e "${GREEN}✓${NC} Health endpoint at /health configured"
else
    echo -e "${RED}✗${NC} Health endpoint missing"
    exit 1
fi

# Check static file serving
echo ""
echo "📁 Checking static file serving..."
if grep -q "express.static" "artifacts/api-server/src/app.ts"; then
    echo -e "${GREEN}✓${NC} Static file serving configured"
else
    echo -e "${RED}✗${NC} Static file serving not found"
    exit 1
fi

# Check SPA fallback
echo ""
echo "🔀 Checking SPA routing fallback..."
if grep -q "app.get(\"\\*\"" "artifacts/api-server/src/app.ts"; then
    echo -e "${GREEN}✓${NC} SPA fallback configured"
else
    echo -e "${RED}✗${NC} SPA fallback missing"
    exit 1
fi

# Check security headers
echo ""
echo "🔒 Checking security headers..."
if grep -q "X-Content-Type-Options" "artifacts/api-server/src/app.ts"; then
    echo -e "${GREEN}✓${NC} Security headers configured"
else
    echo -e "${YELLOW}⚠${NC} Security headers may be missing"
fi

# Check port configuration
echo ""
echo "🔌 Checking port configuration..."
if grep -q "process.env\[\"PORT\"\]" "artifacts/api-server/src/index.ts"; then
    echo -e "${GREEN}✓${NC} PORT environment variable configured"
else
    echo -e "${RED}✗${NC} PORT configuration missing"
    exit 1
fi

# Check database URL usage
echo ""
echo "📊 Checking database configuration..."
if grep -q "DATABASE_URL" ".env.example"; then
    echo -e "${GREEN}✓${NC} DATABASE_URL configured"
else
    echo -e "${RED}✗${NC} DATABASE_URL not documented"
    exit 1
fi

# Check Docker build
echo ""
echo "🐳 Checking Docker configuration..."
if grep -q "FROM node:24-alpine" "Dockerfile"; then
    echo -e "${GREEN}✓${NC} Using Node 24 Alpine"
else
    echo -e "${YELLOW}⚠${NC} Node version differs"
fi

if grep -q "pnpm install --frozen-lockfile" "Dockerfile"; then
    echo -e "${GREEN}✓${NC} Frozen lockfile in Docker"
else
    echo -e "${RED}✗${NC} Frozen lockfile not enforced"
    exit 1
fi

if grep -q "HEALTHCHECK" "Dockerfile"; then
    echo -e "${GREEN}✓${NC} Healthcheck configured"
else
    echo -e "${RED}✗${NC} Healthcheck missing"
    exit 1
fi

# Check railway.json
echo ""
echo "🚂 Checking Railway configuration..."
if grep -q "dockerfile" "railway.json"; then
    echo -e "${GREEN}✓${NC} Dockerfile builder configured"
else
    echo -e "${RED}✗${NC} Dockerfile builder not set"
    exit 1
fi

if grep -q "artifacts/api-server/dist/index.mjs" "railway.json"; then
    echo -e "${GREEN}✓${NC} Start command configured"
else
    echo -e "${RED}✗${NC} Start command missing"
    exit 1
fi

# Git checks
echo ""
echo "📦 Checking Git..."
if [ -d ".git" ]; then
    echo -e "${GREEN}✓${NC} Git repository initialized"
    if git log -1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} Initial commit exists"
    else
        echo -e "${YELLOW}⚠${NC} No commits yet"
    fi
else
    echo -e "${RED}✗${NC} Not a Git repository"
    exit 1
fi

# Final checks
echo ""
echo "✅ All checks passed!"
echo ""
echo "📝 Next steps:"
echo "1. Verify .env.example has all required variables"
echo "2. Run: docker-compose up --build (to test locally)"
echo "3. Push to GitHub: git push origin main"
echo "4. Deploy on Railway.app"
echo ""
