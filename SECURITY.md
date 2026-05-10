# 🔐 Security Guide - POS System Deployment

## ✅ What's Protected

Your `.gitignore` now blocks these sensitive files from ever being committed:

```
✓ .env files (all variants)
✓ Private keys (.key, .pem)
✓ Credentials and tokens
✓ Database backups
✓ API keys (AWS, Google Cloud, etc.)
✓ Logs (may contain sensitive data)
```

---

## 📋 Your Safe Workflow

### 1. **Local Development** (Your Machine)

```
✓ .env ← Contains your LOCAL passwords (NEVER commit)
✓ .env.example ← Template only (SAFE to commit)
```

**Create local .env:**
```bash
cp .env.example .env
# Then edit .env with your local database password
```

### 2. **GitHub** (Public Repo)

✅ **Safe to push:**
- Source code
- `.env.example` (template)
- Configuration files (without secrets)
- Documentation

❌ **NEVER push:**
- `.env` files
- Database passwords
- API keys
- Private certificates

### 3. **Railway Deployment** (Production)

✅ **Set variables safely on Railway:**

#### Option A: Via Railway Dashboard
1. Go to: https://railway.app/dashboard
2. Select your project `diligent-wonder`
3. Click "Variables" tab
4. Add each variable:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `LOG_LEVEL` = `info`
   - `DATABASE_URL` = (Railway auto-sets this)

#### Option B: Via .env File (Local Deploy Only)

Create `.env.production` in root (locally, never commit):

```env
DATABASE_URL=postgresql://produser:prodpass@host:5432/pos_db
NODE_ENV=production
LOG_LEVEL=info
```

Then Railway only reads this during local `railway up` commands.

---

## 🚀 Safe Deployment Steps

### Step 1: Verify .gitignore

```bash
# Check that .env is ignored
git check-ignore -v .env
# Output: .env:68:	.env

# Check what will be committed
git status
# Should NOT show .env files
```

### Step 2: Create Local .env (Not Committed)

```bash
cp .env.example .env
# Edit .env with YOUR local settings
# This file won't be pushed to GitHub ✅
```

### Step 3: Push Safe Files to GitHub

```bash
# Only safe files are committed
git add .
git commit -m "Add deployment configuration"
git push origin main
```

### Step 4: Configure Railway (Production Secrets)

Visit: https://railway.app/dashboard

1. Select project `diligent-wonder`
2. Variables tab
3. Add secrets from `.env.example` (but with production values)

**Railway auto-sets:**
- `DATABASE_URL` (from PostgreSQL service)
- `PORT` (from service config)

**You set manually:**
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- Any API keys you need

---

## 📁 File Security Checklist

```
✓ Source code files (.ts, .tsx, .js) - Safe to commit
✓ Configuration files (tsconfig.json, vite.config.ts) - Safe
✓ .env.example (template only) - Safe
✓ Deployment configs (Dockerfile, docker-compose.yml) - Safe
✓ Documentation (README.md, DEPLOYMENT_GUIDE.md) - Safe

✗ .env files - DO NOT COMMIT
✗ .env.production - DO NOT COMMIT
✗ Private keys - DO NOT COMMIT
✗ Database passwords - DO NOT COMMIT
✗ API tokens - DO NOT COMMIT
✗ SSL certificates - DO NOT COMMIT
```

---

## 🔍 Verify Your Repo is Secure

### Check: No secrets in git history

```bash
# Scan for common secret patterns
git log -p | grep -i "password\|secret\|api_key\|token"
# Should return NOTHING

# Check for .env files
git ls-files | grep "\.env"
# Should only show: .env.example
```

### Check: Correct .gitignore

```bash
# These should all be ignored:
git check-ignore -v .env
git check-ignore -v .env.production
git check-ignore -v secret.json
```

---

## ⚠️ If You Accidentally Committed Secrets

**Never push to public repo!** Before pushing, remove from history:

```bash
# Remove single file from history (entire repo)
git filter-branch --tree-filter 'rm -f .env' HEAD

# Or use BFG Repo-Cleaner (easier)
bfg --delete-files .env

# Force push (WARNING: rewrites history)
git push --force-with-lease origin main
```

**Then rotate any exposed keys immediately!**

---

## 🛡️ Railway Production Security

### Environment Variables Encryption

Railroad encrypts all environment variables:
- ✅ Stored encrypted in database
- ✅ Only decrypted when service starts
- ✅ Never logged or exposed
- ✅ Not visible in build logs

### Best Practices on Railway

1. **Use separate projects** for dev/staging/production
2. **Never hardcode** secrets in code
3. **Rotate keys** regularly
4. **Use minimal permissions** for database users
5. **Enable audit logging** if available

---

## 📚 Quick Reference

| What | Where | Commit? |
|------|-------|---------|
| Source code | `artifacts/**/*.ts` | ✅ Yes |
| Dependencies | `package.json` | ✅ Yes |
| TypeScript config | `tsconfig.json` | ✅ Yes |
| Dockerfile | Root or `docker/` | ✅ Yes |
| `.env.example` | Root | ✅ Yes |
| `.env` | Root | ❌ No |
| `.env.production` | Root | ❌ No |
| Database passwords | Anywhere | ❌ No |
| API keys | Code | ❌ No |
| Private certs | Anywhere | ❌ No |

---

## 🎯 Summary

Your repo is now **production-ready and secure**:

1. ✅ `.gitignore` blocks all sensitive files
2. ✅ `.env.example` provides safe template
3. ✅ `.env` files never committed locally
4. ✅ Railway stores secrets encrypted
5. ✅ Safe to push to public GitHub

**You can now safely deploy! 🚀**
