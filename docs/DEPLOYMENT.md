# NexusBoard - Deployment Guide

> **Version:** 1.0.0 | **Platform:** Vercel

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Database Setup (Neon PostgreSQL)](#2-database-setup-neon-postgresql)
3. [Environment Variables](#3-environment-variables)
4. [Vercel Deployment](#4-vercel-deployment)
5. [Post-Deployment](#5-post-deployment)
6. [Custom Domain Setup](#6-custom-domain-setup)
7. [Monitoring & Logging](#7-monitoring--logging)
8. [Troubleshooting](#8-troubleshooting)
9. [Rollback Procedure](#9-rollback-procedure)

---

## 1. Prerequisites

- [Vercel account](https://vercel.com) (free Hobby plan works)
- [Neon account](https://neon.tech) (free tier: 0.5 GB)
- [GitHub account](https://github.com) with the repository connected
- [Razorpay account](https://razorpay.com) (for payments)
- [Resend account](https://resend.com) (for email)
- [Cloudinary account](https://cloudinary.com) (for file storage)

---

## 2. Database Setup (Neon PostgreSQL)

### 2.1 Create a Neon Project

1. Go to [neon.tech](https://neon.tech) and sign in
2. Click **"Create Project"**
3. Choose a region closest to your users
4. Copy the connection string (format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)

### 2.2 Switch Prisma Provider

For production, change the database provider in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2.3 Push Schema to Neon

```bash
# Set your Neon connection string
export DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Push the schema
npx prisma db push

# Generate the Prisma client
npx prisma generate
```

---

## 3. Environment Variables

### 3.1 Generate Auth Secret

```bash
openssl rand -base64 32
```

### 3.2 Configure in Vercel

Go to your Vercel project > **Settings** > **Environment Variables** and add:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Your Neon connection string | Must include `?sslmode=require` |
| `AUTH_SECRET` | Generated random string | 32+ characters |
| `RAZORPAY_KEY_ID` | Your Razorpay key | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret | From Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Your webhook secret | From Razorpay webhook settings |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as RAZORPAY_KEY_ID | Exposed to client |
| `RESEND_API_KEY` | Your Resend key | From Resend dashboard |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` | Must be verified domain |
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Your API key | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Your API secret | From Cloudinary dashboard |
| `APP_URL` | `https://yourdomain.com` | Public URL of your app |

---

## 4. Vercel Deployment

### 4.1 Connect GitHub Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `nexusboard-saas-platform` repository
3. Vercel will auto-detect Next.js

### 4.2 Build Settings

Vercel auto-detects these settings, but verify:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Build Command | `npx prisma generate && next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 18.x |

### 4.3 Deploy

Click **"Deploy"**. Vercel will:
1. Install dependencies
2. Generate Prisma client
3. Build the Next.js application
4. Deploy to their Edge Network

### 4.4 CI/CD

Every push to the `main` branch triggers an automatic deployment.

---

## 5. Post-Deployment

### 5.1 Seed Production Data

For initial setup, you can run the seed script locally against the production database:

```bash
DATABASE_URL="postgresql://..." npx tsx prisma/seed.ts
```

### 5.2 Create Admin User

Use the seed script or register via the app and manually update the role in the database.

### 5.3 Verify Webhooks

Configure Razorpay webhooks to point to:
```
https://your-domain.com/api/payments?action=webhook
```

---

## 6. Custom Domain Setup

1. In Vercel project > **Settings** > **Domains**
2. Add your domain (e.g., `nexusboard.yourdomain.com`)
3. Update DNS records as instructed by Vercel
4. SSL is automatically provisioned

---

## 7. Monitoring & Logging

- **Vercel Logs**: Real-time function logs in the Vercel dashboard
- **Vercel Analytics**: Web analytics built-in (opt-in)
- **Audit Logs**: In-app audit log system (accessible by SUPER_ADMIN)
- **Neon Console**: Database performance monitoring

---

## 8. Troubleshooting

### Database Connection Errors
- Verify `DATABASE_URL` includes `?sslmode=require`
- Check Neon console for connection limits
- Verify Prisma provider is set to `postgresql`

### Build Failures
- Ensure `prisma generate` runs before `next build`
- Check that all environment variables are set
- Review Vercel build logs for specific errors

### Payment Issues
- Verify Razorpay keys are correctly set
- Test with Razorpay test mode first
- Check webhook URL is accessible

---

## 9. Rollback Procedure

1. Go to Vercel project > **Deployments**
2. Find the last successful deployment
3. Click **"..."** > **"Promote to Production"**

Or use the Vercel CLI:
```bash
npx vercel rollback
```

---

*For questions, refer to [docs/ARCHITECTURE.md](ARCHITECTURE.md) or [docs/SECURITY.md](SECURITY.md).*
