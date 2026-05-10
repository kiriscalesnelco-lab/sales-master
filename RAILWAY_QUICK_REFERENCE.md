# Railway Deployment Quick Reference

## 🎯 Deploy in 5 Minutes

### 1. Prerequisites
```bash
# Have these installed:
- git
- GitHub/GitLab account
- Railway CLI (optional)
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. Connect to Railway
Visit: https://railway.app/new

Choose: **Deploy from GitHub**

### 4. Configure
- Repo: Select `Sales-Master`
- Add **PostgreSQL** service
- Set `NODE_ENV=production`

### 5. Deploy
Click **Deploy** → Wait 3-5 min → Done! ✅

---

## 📋 Files Created

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage production build |
| `docker-compose.yml` | Local testing with DB |
| `railway.json` | Railway configuration |
| `.env.example` | Environment variables template |
| `.dockerignore` | Build optimization |
| `.railwayignore` | Railway build optimization |
| `DEPLOYMENT_GUIDE.md` | Complete instructions |
| `scripts/deploy-railway.sh` | Linux/Mac setup script |
| `scripts/deploy-railway.ps1` | Windows PowerShell setup |

---

## 🔑 Key Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

**Railway auto-sets `DATABASE_URL` when PostgreSQL is linked** ✅

---

## 🧪 Local Testing

```bash
# Copy env template
cp .env.example .env

# Start all services
docker-compose up --build

# Access at http://localhost:3000
```

---

## 📊 Architecture

```
┌─────────────────────────────────┐
│   Railway Container (App)       │
├─────────────────────────────────┤
│  Node.js 24 (Alpine Linux)      │
│  ├─ Express API Server          │
│  └─ React Frontend (Static)     │
├─────────────────────────────────┤
│   PostgreSQL Database           │
│   (Linked via DATABASE_URL)     │
└─────────────────────────────────┘
     ↑
  https://your-app-xxxxx.railway.app
```

---

## 💰 Monthly Cost

| Service | Free Tier | Paid |
|---------|-----------|------|
| App Container | 10GB/month | $5-20 |
| PostgreSQL | 5GB storage | Included |
| Custom Domain | N/A | $2.50 |
| **Total** | **$0** | **~$2.50** |

---

## ✅ Verify Deployment

```bash
# Check health endpoint
curl https://your-app-xxxxx.railway.app/health

# View logs
railway logs

# Open dashboard
railway open
```

---

## 🚨 Troubleshooting

### Build Failed
→ Check Railway build logs for details

### Database Not Connected
→ Verify `DATABASE_URL` in Variables
→ PostgreSQL service must be healthy

### Frontend Not Loading
→ Check browser console for API errors
→ Verify Express serves static files

### Can't Push to GitHub
```bash
git remote add origin https://github.com/USER/REPO.git
git branch -M main
git push -u origin main
```

---

## 📚 Learn More

- [Railway Docs](https://docs.railway.app)
- [Docker Reference](https://docs.docker.com)
- [PostgreSQL Guide](https://www.postgresql.org/docs/)

---

## 🎉 That's It!

Your **Production POS System** is now live on:
```
https://your-app-xxxxx.railway.app
```

Enjoy your low-cost, fully managed deployment! 🚀
