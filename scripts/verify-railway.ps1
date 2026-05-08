# Railway Deployment Verification Script (PowerShell)
# Checks all critical deployment components before pushing to Railway

$ErrorActionPreference = "Stop"

Write-Host "🔍 Railway Deployment Verification" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

$passed = 0
$failed = 0
$warnings = 0

function Check-File {
    param([string]$Path)
    if (Test-Path $Path) {
        Write-Host "✓ $Path exists" -ForegroundColor Green
        $script:passed++
        return $true
    } else {
        Write-Host "✗ $Path missing" -ForegroundColor Red
        $script:failed++
        return $false
    }
}

function Check-Command {
    param([string]$Command)
    if (Get-Command $Command -ErrorAction SilentlyContinue) {
        Write-Host "✓ $Command installed" -ForegroundColor Green
        $script:passed++
        return $true
    } else {
        Write-Host "✗ $Command not found" -ForegroundColor Red
        $script:failed++
        return $false
    }
}

function Check-FileContent {
    param([string]$Path, [string]$Pattern, [string]$Description)
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw
        if ($content -match $Pattern) {
            Write-Host "✓ $Description" -ForegroundColor Green
            $script:passed++
            return $true
        } else {
            Write-Host "✗ $Description" -ForegroundColor Red
            $script:failed++
            return $false
        }
    } else {
        Write-Host "✗ File not found: $Path" -ForegroundColor Red
        $script:failed++
        return $false
    }
}

# Check tools
Write-Host "`n📦 Checking tools..." -ForegroundColor Yellow
Check-Command "node" | Out-Null
Check-Command "pnpm" | Out-Null

# Check configuration files
Write-Host "`n📋 Checking configuration files..." -ForegroundColor Yellow
Check-File "Dockerfile" | Out-Null
Check-File "railway.json" | Out-Null
Check-File "docker-compose.yml" | Out-Null
Check-File ".env.example" | Out-Null
Check-File ".railwayignore" | Out-Null
Check-File "pnpm-workspace.yaml" | Out-Null
Check-File "pnpm-lock.yaml" | Out-Null

# Check build configs
Write-Host "`n🏗️ Checking build configs..." -ForegroundColor Yellow
Check-File "artifacts/api-server/package.json" | Out-Null
Check-File "artifacts/api-server/tsconfig.json" | Out-Null
Check-File "artifacts/pos-system/package.json" | Out-Null
Check-File "artifacts/pos-system/tsconfig.json" | Out-Null

# Check Express configuration
Write-Host "`n🏥 Checking Express configuration..." -ForegroundColor Yellow
Check-FileContent "artifacts/api-server/src/app.ts" 'app.get\("/health"' "Health endpoint at /health" | Out-Null
Check-FileContent "artifacts/api-server/src/app.ts" "express.static" "Static file serving" | Out-Null
Check-FileContent "artifacts/api-server/src/app.ts" 'app.get\("\*"' "SPA fallback routing" | Out-Null
Check-FileContent "artifacts/api-server/src/app.ts" "X-Content-Type-Options" "Security headers" | Out-Null

# Check index.ts
Write-Host "`n🔌 Checking port configuration..." -ForegroundColor Yellow
Check-FileContent "artifacts/api-server/src/index.ts" 'process.env\["PORT"\]' "PORT environment variable" | Out-Null

# Check .env.example
Write-Host "`n📊 Checking environment configuration..." -ForegroundColor Yellow
Check-FileContent ".env.example" "DATABASE_URL" "DATABASE_URL configured" | Out-Null

# Check Docker
Write-Host "`n🐳 Checking Docker configuration..." -ForegroundColor Yellow
Check-FileContent "Dockerfile" "FROM node:24-alpine" "Using Node 24 Alpine" | Out-Null
Check-FileContent "Dockerfile" "--frozen-lockfile" "Frozen lockfile enforcement" | Out-Null
Check-FileContent "Dockerfile" "HEALTHCHECK" "Healthcheck configured" | Out-Null

# Check Railway config
Write-Host "`n🚂 Checking Railway configuration..." -ForegroundColor Yellow
Check-FileContent "railway.json" '"dockerfile"' "Dockerfile builder configured" | Out-Null
Check-FileContent "railway.json" "artifacts/api-server/dist/index.mjs" "Start command configured" | Out-Null

# Check Git
Write-Host "`n📦 Checking Git..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "✓ Git repository initialized" -ForegroundColor Green
    $script:passed++
    try {
        $log = git log -1 2>&1
        Write-Host "✓ Initial commit exists" -ForegroundColor Green
        $script:passed++
    } catch {
        Write-Host "⚠ No commits yet" -ForegroundColor Yellow
        $script:warnings++
    }
} else {
    Write-Host "✗ Not a Git repository" -ForegroundColor Red
    $script:failed++
}

# Summary
Write-Host "`n" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Passed: $passed" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  ✗ Failed: $failed" -ForegroundColor Red
}
if ($warnings -gt 0) {
    Write-Host "  ⚠ Warnings: $warnings" -ForegroundColor Yellow
}

if ($failed -eq 0) {
    Write-Host "`n✅ All critical checks passed!" -ForegroundColor Green
    Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Verify .env.example has all required variables" -ForegroundColor White
    Write-Host "  2. Run: docker-compose up --build (to test locally)" -ForegroundColor White
    Write-Host "  3. Push to GitHub: git push origin main" -ForegroundColor White
    Write-Host "  4. Deploy on Railway.app" -ForegroundColor White
    Write-Host "`n" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Some checks failed. Please fix the issues above." -ForegroundColor Red
    exit 1
}
