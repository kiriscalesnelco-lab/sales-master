# Railway Deployment Guide

## Overview
This project is configured for Railway deployment with automatic build and deployment from the `dist` folder.

## Project Structure
- **POS System**: React/Vite frontend application
- **API Server**: Express.js backend with TypeScript

## Railway Configuration

### Files Created
- `railway.toml` - Main Railway configuration
- `.railwayignore` - Files to exclude from deployment
- `vite.config.railway.ts` - Railway-specific Vite config for frontend
- `build.railway.mjs` - Railway-specific build script for backend

### Environment Variables
Set these in Railway dashboard:

**For POS System:**
- `PORT=3000`
- `NODE_ENV=production`
- `BASE_PATH=/`

**For API Server:**
- `PORT=8000`
- `NODE_ENV=production`
- Add any database connection strings or API keys needed

## Deployment Process

### Automatic Deployment
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the `railway.toml` configuration
3. Build process runs automatically:
   - Installs dependencies with `pnpm install`
   - Builds frontend and backend
   - Deploys to Railway infrastructure

### Manual Deployment Steps
1. Push changes to your GitHub repository
2. Railway will automatically trigger a new deployment
3. Monitor deployment logs in Railway dashboard

## Build Output
- Frontend builds to `artifacts/pos-system/dist/`
- Backend builds to `artifacts/api-server/dist/`
- Railway serves the built files from these directories

## URLs After Deployment
- POS System: `https://your-app-name.railway.app/`
- API Server: `https://your-api-name.railway.app/`

## Troubleshooting

### Common Issues
1. **Build failures**: Check that all dependencies are in `package.json`
2. **Port conflicts**: Ensure PORT environment variables match configuration
3. **Base path issues**: Verify BASE_PATH is set correctly for frontend

### Debug Commands
- View deployment logs in Railway dashboard
- Check environment variables in Railway settings
- Verify build output in Railway build tab

## Local Development
Run locally to test before deployment:
```bash
# Frontend
cd artifacts/pos-system
pnpm install
pnpm run dev

# Backend
cd artifacts/api-server
pnpm install
pnpm run dev
```
