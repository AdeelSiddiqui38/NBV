# Deploying NBV CRM to Vercel with Neon PostgreSQL

This guide covers deploying the NBV CRM application to Vercel with a Neon PostgreSQL database.

## Prerequisites

- [Vercel Account](https://vercel.com) (free tier available)
- [Neon Account](https://neon.tech) (free tier with generous limits)
- [Node.js 18+](https://nodejs.org/) installed locally
- GitHub account (for Git integration)
- The NBV CRM repository pushed to GitHub
- **✅ Neon Connection String** (You have this!)

## Architecture Overview

```
GitHub Repository
    ↓
Vercel (CI/CD & Hosting)
    ↓
Serverless Functions
    ↓
Neon PostgreSQL Database
```

## Phase 1: ✅ Neon Database Setup (COMPLETE)

You have:
- ✅ Neon project created
- ✅ Connection string ready
- ✅ Database configured

**Your Connection String:**
```
postgresql://user:password@ep-xxxxx.region.neon.tech/nbv_crm?sslmode=require
```

---

## Phase 2: Configure Application for Vercel

### Step 1: Update Environment Variables

1. Create `.env.local` in your project root:

```bash
cp .env.vercel.example .env.local
```

2. Edit `.env.local` with your Neon connection string:

```env
# Database - Neon PostgreSQL
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-1.neon.tech/nbv_crm?sslmode=require

# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

# Security (Generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_minimum_32_characters_here
JWT_EXPIRATION=7d
SESSION_SECRET=your_session_secret_minimum_32_characters_here

# API Configuration
API_KEY=your_api_key_here
NEXT_PUBLIC_API_KEY=your_public_api_key

# Email (SendGrid - free tier available)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
MAIL_FROM=noreply@nextbridgeventures.com
```

### Step 2: Test Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health
```

### Step 3: Push to GitHub

```bash
# Add all files
git add .

# Commit changes
git commit -m "Setup Vercel + Neon deployment configuration"

# Push to GitHub
git push origin main
```

---

## Phase 3: Deploy to Vercel

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Link Project

```bash
vercel link
```

Follow the prompts:
- Select your GitHub organization/account
- Choose "NBV" repository
- Set project name: `nbv-crm`
- Select "Other" as framework

### Step 4: Configure Environment Variables in Vercel

**Option A: Via CLI**

```bash
vercel env add DATABASE_URL
# Paste your Neon connection string

vercel env add JWT_SECRET
# Generate and paste: openssl rand -base64 32

vercel env add SESSION_SECRET
# Generate and paste: openssl rand -base64 32

vercel env add API_KEY
# Generate and paste: openssl rand -base64 32

vercel env add SMTP_PASSWORD
# Paste your SendGrid API key
```

**Option B: Via Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your NBV project
3. Go to "Settings" → "Environment Variables"
4. Add each variable:

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
JWT_SECRET=...
JWT_EXPIRATION=7d
SESSION_SECRET=...
API_KEY=...
NEXT_PUBLIC_API_KEY=...
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=...
MAIL_FROM=noreply@nextbridgeventures.com
MAIL_FROM_NAME=NBV CRM
```

### Step 5: Deploy

```bash
vercel --prod
```

Or deploy via dashboard:
1. Push to `main` branch
2. Vercel automatically deploys
3. Get your deployment URL

---

## Phase 4: Post-Deployment Setup

### Step 1: Test Deployment

```bash
# Test health endpoint
curl https://your-project.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-06-15T16:00:00.000Z",
  "environment": "production",
  "database": {
    "status": "connected",
    "latency": "45ms",
    "configured": true
  },
  "performance": {
    "responseTime": "120ms"
  },
  "version": "1.0.0"
}
```

### Step 2: Run Database Migrations

```bash
# Pull environment variables
vercel env pull

# Run migrations
npx prisma migrate deploy

# Or if using raw SQL migrations
psql $DATABASE_URL < migrations/001_initial.sql
```

### Step 3: Verify Database Connection

```bash
# Test database connectivity
vercel logs
```

---

## Setting Up Custom Domain (Optional)

### Step 1: Add Domain to Vercel

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Enter: `crm.nextbridgeventures.com`
3. Choose DNS method

### Step 2: Update DNS Records

If using CNAME:
```
crm.nextbridgeventures.com CNAME your-project.vercel.app
```

If using Vercel Nameservers:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### Step 3: Update Environment Variables

Update `NEXT_PUBLIC_API_URL` to your custom domain:
```env
NEXT_PUBLIC_API_URL=https://crm.nextbridgeventures.com
```

---

## Monitoring & Logs

### View Deployment Logs

```bash
# Real-time logs
vercel logs

# With filtering
vercel logs --tail
vercel logs --since 2h
```

### Monitor Performance

1. Vercel Dashboard → Analytics
2. Check:
   - Response times
   - Error rates
   - Traffic patterns
   - Edge requests

### Database Monitoring

In Neon Dashboard:
- Monitor query performance
- Check storage usage (Free: 3GB)
- View connection count
- Set up alerts

---

## Troubleshooting

### Connection Timeout

**Problem**: `Error: connect ETIMEDOUT`

**Solution**:
```bash
# Verify connection string is correct
echo $DATABASE_URL

# Test connection locally
psql $DATABASE_URL -c "SELECT 1"

# Check Neon IP whitelist
# In Neon: Settings → Network Access → Add Vercel IPs
```

### Memory Exceeded

**Problem**: `Function exceeded maximum memory size`

**Solution**: Edit `vercel.json`
```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 2048,
      "maxDuration": 30
    }
  }
}
```

### Cold Start Issues

**Problem**: First request is slow (5-10 seconds)

**Solution**:
- Normal for serverless functions
- Use connection pooling in Neon
- Consider using Vercel's Cron Jobs for warm-ups

### Database Not Accessible

**Problem**: `ECONNREFUSED` or `ENOTFOUND`

**Solution**:
1. Verify `DATABASE_URL` is set in Vercel
2. Check Neon project status
3. Ensure connection string is current
4. Test with: `vercel env pull && psql $DATABASE_URL -c "SELECT 1"`

---

## Cost Breakdown (Monthly)

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Vercel** | ✅ 100GB bandwidth | $20-100/month |
| **Neon PostgreSQL** | ✅ 3GB storage, 0.5GB compute | $0-50/month |
| **SendGrid** | ✅ 100 emails/day | $0-20/month |
| **Total Startup** | **$0-10/month** | - |
| **Total Scale** | **$20-50/month** | **$40-170/month** |

---

## Security Best Practices

✅ **Environment Variables**: Use Vercel's encrypted variables  
✅ **Database**: SSL connections enabled by default (Neon)  
✅ **API Keys**: Rotate regularly, use secure generation  
✅ **CORS**: Configure properly in your app  
✅ **Rate Limiting**: Implement in API routes  
✅ **Backups**: Neon provides daily backups  
✅ **Monitoring**: Set up Sentry for error tracking  

---

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys:
- Push to `main` → Production
- Push to feature branches → Preview
- Pull requests → Preview

### Production Protection

1. Vercel Dashboard → Settings → Git
2. Configure:
   - Production branch: `main`
   - Preview deployments: "All pull requests"
   - Deploy on push: Enabled
   - Build command: `npm run build`
   - Output directory: `.next` or `dist`

---

## Next Steps

1. ✅ Phase 1: Neon setup (DONE)
2. 📋 Phase 2: Configure application
3. 🚀 Phase 3: Deploy to Vercel
4. ✨ Phase 4: Post-deployment setup
5. 🔒 Add custom domain
6. 📊 Set up monitoring
7. 🔄 Enable auto-scaling

---

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Connection Best Practices](https://neon.tech/docs/connect/connect-from-any-app)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Prisma + Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

---

**Last Updated:** June 2026  
**Version:** 1.0.0  
**Status:** Ready for Phase 2
