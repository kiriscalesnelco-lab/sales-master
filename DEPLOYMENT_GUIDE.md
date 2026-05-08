# Railway.app Deployment Guide - POS System

Complete guide to deploy your full-stack POS system (Backend + Frontend + Database) on Railway for under $5/month.

## 📋 Prerequisites

- [Railway Account](https://railway.app) (free to start)
- Git repository (GitHub, GitLab, or Bitbucket)
- GitHub account (or GitLab/Bitbucket)

## 🚀 Step 1: Prepare Your Repository

### Option A: If using GitHub (Recommended)

1. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/Sales-Master.git
   git branch -M main
   git push -u origin main
   ```

2. Visit [railway.app](https://railway.app)

### Option B: Without GitHub

Use Railway's Git CLI option during setup.

## 🎯 Step 2: Create Railway Project

1. **Sign in to Railway** → Click "New Project"
2. **Select "Deploy from GitHub"** (if using GitHub)
3. **Authorize Railway** to access your GitHub
4. **Select the `Sales-Master` repository**
5. Click **"Add Service"** → Select **GitHub repo**

## 🔧 Step 3: Configure Services

Railway will auto-detect `Dockerfile` and create a service. Now add PostgreSQL:

### Add PostgreSQL Database

1. In your Railway project, click **"+ Add Service"**
2. Select **"PostgreSQL"** from the add menu
3. Railway auto-creates a database with these environment variables:
   - `DATABASE_URL` (auto-generated, your backend will read this)
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

## 🔐 Step 4: Set Environment Variables

1. Go to **Variables tab** in the API Service
2. Add these variables:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

**The `DATABASE_URL` is automatically linked from PostgreSQL service** ✅

## 📡 Step 5: Deploy

### First Deployment (Automatic)

1. Click **"Deploy"** or it auto-deploys on Git push
2. Watch the build logs:
   - ✅ Dependencies install
   - ✅ Backend builds
   - ✅ Frontend builds
   - ✅ Docker container starts

3. After ~3-5 minutes, you'll see:
   ```
   ✓ Deployment successful
   Domain: your-app-xxxxx.railway.app
   ```

### Subsequent Deployments

Just push to GitHub and Railway auto-deploys:
```bash
git add .
git commit -m "Update POS system"
git push origin main
```

## 🌐 Access Your Application

- **Frontend & API**: `https://your-app-xxxxx.railway.app`
- **Health Check**: `https://your-app-xxxxx.railway.app/health`

The React frontend is served at the root, and Express API routes are available at `/api/*`.

## 💾 Database Migrations

On first deploy, Drizzle will auto-create tables if not exists. To manually run migrations:

In Railway terminal:
```bash
pnpm --filter @workspace/db run push
```

Or SSH into the container and run it there.

## 📊 Monitor Your Deployment

1. **Logs**: Railway Dashboard → Logs tab
2. **Metrics**: CPU, Memory, Network usage
3. **Networking**: View your custom domain

## 🛠️ Local Testing (Optional)

Before deploying to Railway, test locally with Docker:

```bash
# Copy environment
cp .env.example .env

# Build and run locally
docker-compose up --build
```

Then visit `http://localhost:3000`

## ⚠️ Common Issues

### Build Fails - "pnpm not found"
- Railway uses Node 24, which has pnpm. Check build logs for actual error.

### Database Connection Timeout
- Ensure PostgreSQL service is linked and healthy
- Check `DATABASE_URL` format

### Frontend Not Loading
- Ensure Express serves static files from `/artifacts/pos-system/dist`
- Check browser console for API URL

### "Port already in use"
- Railway automatically assigns ports; don't hardcode in Express

## 💰 Pricing

- **API Service** (Free tier): 10GB data/month, CPU/Memory limits
- **PostgreSQL** (Free tier): 5GB storage, generous limits
- **Custom Domain**: $2.50/month (optional)
- **Total**: ~$2.50/month for custom domain (free with railway.app domain)

## 🚀 Next Steps

1. **Set Custom Domain** (optional): Railway Dashboard → Settings → Domain
2. **Enable Auto-Deploy**: Already enabled on Git push
3. **Backup Database**: Railroad supports Postgres backups
4. **Monitor Performance**: Use Railway's metrics dashboard

## 📖 Useful Links

- [Railway Documentation](https://docs.railway.app)
- [Dockerfile Reference](https://docs.railway.app/deploy/dockerfiles)
- [Environment Variables](https://docs.railway.app/develop/variables)
- [Database Backups](https://docs.railway.app/databases/postgresql)

## ✅ Deployment Checklist

- [ ] GitHub repository created
- [ ] GitHub connected to Railway
- [ ] PostgreSQL service added
- [ ] Environment variables set
- [ ] First deployment successful
- [ ] Frontend accessible at custom domain
- [ ] API endpoints responding
- [ ] Database connected successfully

## 🆘 Need Help?

- Check Railway Logs for errors
- Join [Railway Discord](https://discord.gg/railway)
- Review [GitHub Issues](https://github.com/your-repo/issues)

---

**Happy deploying! 🎉 Your POS system is now live on Railway.**
