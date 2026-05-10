# Railway Deployment - Issues Fixed & Setup Guide

## 🔧 Issues Fixed

### 1. ✅ Health Check Endpoint Mismatch
**Problem:** Dockerfile expected `/health` but API only had `/api/healthz`
**Solution:** Added root-level `/health` endpoint in Express app

### 2. ✅ Frontend Not Served
**Problem:** Express didn't serve React static files from build
**Solution:** 
- Added static file serving from `pos-system/dist` directory
- Configured 1-day cache for static assets

### 3. ✅ SPA Routing Fallback Missing
**Problem:** React client-side routes returned 404
**Solution:** Added fallback to `index.html` for all unmatched routes

### 4. ✅ Security Headers Missing
**Problem:** No security headers configured
**Solution:** Added X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

### 5. ✅ Dockerfile Multi-stage Build Simplified
**Problem:** Unnecessary 3rd stage for frontend building
**Solution:** Consolidated to 2-stage build (builder → production)

### 6. ✅ Request Size Limit
**Problem:** Large file uploads would fail
**Solution:** Increased JSON/URL-encoded limits to 50MB

---

## 🚀 Railway Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Fix Railway deployment configuration"
git push origin main
```

### Step 2: Railway Dashboard Setup
1. Go to [railway.app](https://railway.app)
2. **Create New Project** → "Deploy from GitHub"
3. Select the `Sales-Master` repository
4. Wait for auto-detection (Docker build should be recognized)

### Step 3: Add PostgreSQL
1. Click **"+ Add Service"**
2. Select **"PostgreSQL"**
3. Railway automatically creates the service and `DATABASE_URL`

### Step 4: Configure Environment Variables
Set these in the API service **Variables** tab:
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

**Important:** `DATABASE_URL` is auto-set by PostgreSQL service linking ✅

### Step 5: Deploy
1. Click **"Deploy"** or push to main branch
2. Monitor build logs for:
   ```
   ✓ Installing dependencies
   ✓ Building packages
   ✓ Copying artifacts
   ✓ Starting server
   ```

3. Wait 3-5 minutes for deployment
4. Access at: `https://your-app-xxxxx.railway.app`

---

## 📊 What Gets Served

| URL | Purpose |
|-----|---------|
| `https://your-app.railway.app/` | React POS frontend |
| `https://your-app.railway.app/api/*` | Backend API routes |
| `https://your-app.railway.app/health` | Health check (for monitoring) |
| `https://your-app.railway.app/api/healthz` | Detailed health (via API router) |

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Health check passes: `GET /health` → `200 OK`
- [ ] Frontend loads at root URL
- [ ] API works: `GET /api/categories` → list of categories
- [ ] Navigation works without 404s (SPA routing)
- [ ] Logs appear in Railway dashboard
- [ ] No error messages in container logs

---

## 🐛 Troubleshooting

### Build Fails - "pnpm not found"
```
Solution: Node 24 includes pnpm. Check full logs for real error.
Usually a dependency issue - check pnpm-lock.yaml is committed.
```

### "Database Connection Timeout"
```
Solution:
1. Verify PostgreSQL service is running (Railway dashboard)
2. Check DATABASE_URL format in Variables tab
3. Ensure PostgreSQL service is linked to API service
4. Check Railway logs for connection attempts
```

### Frontend Shows 404s or Redirects to /404
```
Solution: SPA fallback not working
1. Verify frontend dist files exist: /artifacts/pos-system/dist/index.html
2. Check Docker build includes frontend step
3. Ensure path in app.ts matches: ../../pos-system/dist
4. Rebuild and redeploy
```

### "Error listening on port"
```
Solution: PORT environment variable not set
1. Check Variables in Railway dashboard
2. Ensure PORT=3000 is set
3. Railway auto-assigns ports; make sure app reads from env
```

### Health Check Fails
```
Solution: Container keeps restarting
1. Check /health endpoint returns 200
2. Verify server starts correctly
3. Check logs for startup errors
4. Increase start-period in HEALTHCHECK (5s → 15s)
```

### API Requests Fail with 413
```
Solution: Payload too large
1. Default limit is 50MB (already configured)
2. If still failing, may need to increase in app.ts
3. Check actual payload size
```

---

## 🔄 Redeployment After Updates

After making code changes:
```bash
git add .
git commit -m "Update POS system"
git push origin main
```

Railway automatically:
1. Detects new commit
2. Rebuilds Docker image
3. Restarts container
4. Preserves database

**No manual steps needed!** ✅

---

## 📈 Monitoring on Railway

1. **Logs Tab**: Real-time server output
2. **Metrics Tab**: CPU, Memory, Network usage
3. **Deployments**: View build/deploy history
4. **Health**: Container health status

### View Logs
```bash
# Via Railway CLI
railway logs --follow

# Or view in dashboard: Project → Service → Logs
```

---

## 💰 Cost Estimate

- **Compute** (API): ~$5/month (free tier available)
- **PostgreSQL**: ~$5/month (free tier available)
- **Total**: ~$10/month (or free with tier limits)

Railway offers **$5 free credits per month** → effectively free for small projects.

---

## 🔐 Security Reminders

### Before Production:
1. **Add Authentication** - Current setup has no auth (major gap)
2. **Set CORS restrictions** - Currently allows all origins
3. **Use HTTPS** - Railway auto-enables TLS
4. **Hash OTPs** - Currently stored in plain text
5. **Add Rate Limiting** - Protect against brute force
6. **Add API Keys** - For external integrations

### Use `.env.production` secrets:
- Database credentials
- API keys
- JWT secrets

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | Auto-set by PostgreSQL | PostgreSQL connection string |
| `NODE_ENV` | ✅ | - | Must be `production` |
| `PORT` | ✅ | - | Express listens on this port |
| `LOG_LEVEL` | ❌ | info | Pino log level: error, warn, info, debug |

---

## 🎯 Next Steps

1. **Add Authentication** (JWT/Sessions)
2. **Implement Rate Limiting** (OTP, Login)
3. **Add Database Migrations** (Drizzle push)
4. **Set Custom Domain** (Railway Settings)
5. **Enable Monitoring** (Datadog, New Relic)
6. **Setup CI/CD Checks** (GitHub Actions)

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **GitHub Issues**: Report deployment issues
- **Railway Logs**: Always check container logs first
- **Dockerfile**: Verify local builds work with `docker-compose up`

