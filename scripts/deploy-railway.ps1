# Quick Railway.app Deployment Setup Script (Windows PowerShell)

Write-Host "🚀 Railway.app POS System Deployment Setup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    git config user.name "POS System Admin"
    git config user.email "admin@pos-system.local"
    git add .
    git commit -m "Initial commit: POS System"
    Write-Host "✅ Git initialized" -ForegroundColor Green
    Write-Host ""
}

# Check if Railway CLI is installed
$railwayInstalled = $null -ne (Get-Command railway -ErrorAction SilentlyContinue)

if (-not $railwayInstalled) {
    Write-Host "⚠️  Railway CLI not found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📥 Install Railway CLI:"
    Write-Host "   iwr https://railway.app/install.ps1 -useb | iex"
    Write-Host ""
    Read-Host "Press Enter after installing Railway CLI"
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env created (update with your values)" -ForegroundColor Green
    Write-Host ""
}

Write-Host "📋 Configuration Files Ready:" -ForegroundColor Cyan
Write-Host "  ✓ Dockerfile - Multi-stage build"
Write-Host "  ✓ docker-compose.yml - Local testing"
Write-Host "  ✓ railway.json - Railway configuration"
Write-Host "  ✓ .env.example - Environment template"
Write-Host "  ✓ .dockerignore - Docker build optimization"
Write-Host ""

Write-Host "🧪 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Test locally (optional):" -ForegroundColor Yellow
Write-Host "   docker-compose up --build"
Write-Host ""
Write-Host "2️⃣  Connect to Railway:" -ForegroundColor Yellow
Write-Host "   railway link"
Write-Host ""
Write-Host "3️⃣  Deploy:" -ForegroundColor Yellow
Write-Host "   railway up"
Write-Host ""
Write-Host "4️⃣  View deployment:" -ForegroundColor Yellow
Write-Host "   railway open"
Write-Host ""
Write-Host "📖 For detailed instructions, see: DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Setup complete! Ready to deploy to Railway 🎉" -ForegroundColor Green
