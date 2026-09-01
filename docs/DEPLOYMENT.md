# Deployment Guide

> Essay Writing Competition Management System
> Version: 0.2.1 | Last Updated: 2025

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Database Setup](#database-setup)
5. [Database Migration](#database-migration)
6. [Seed Data](#seed-data)
7. [Vercel Deployment Steps](#vercel-deployment-steps)
8. [Neon PostgreSQL Setup](#neon-postgresql-setup)
9. [Razorpay Setup](#razorpay-setup)
10. [Resend Email Setup](#resend-email-setup)
11. [Cloudinary Setup](#cloudinary-setup)
12. [DNS Configuration](#dns-configuration)
13. [Monitoring & Logging](#monitoring--logging)
14. [Scaling Considerations](#scaling-considerations)
15. [Free Tier Limitations](#free-tier-limitations)
16. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Prerequisites

Before deploying or developing, ensure you have accounts with the following services:

| Service | Purpose | Free Tier | Sign Up |
|---------|---------|-----------|---------|
| **Node.js 18+** | Runtime environment | — | [nodejs.org](https://nodejs.org/) |
| **Bun** | Package manager & script runner | — | [bun.sh](https://bun.sh/) |
| **Vercel** | Hosting & serverless deployment | Hobby plan (free) | [vercel.com](https://vercel.com/) |
| **Neon** | PostgreSQL database (production) | 0.5 GB storage | [neon.tech](https://neon.tech/) |
| **Razorpay** | Payment gateway | Test mode (free) | [razorpay.com](https://razorpay.com/) |
| **Resend** | Transactional email | 100 emails/day | [resend.com](https://resend.com/) |
| **Cloudinary** | Essay PDF file storage | 25 GB storage | [cloudinary.com](https://cloudinary.com/) |

### Local Development Only

- **SQLite** — Included with Bun/Node.js; no separate installation needed.
- A terminal/shell with `git` installed.

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd my-project
```

### 2. Install Dependencies

```bash
bun install
```

> Uses Bun as the package manager. The project uses `bun.lock` for dependency locking.

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your local development values (see [Environment Variables Reference](#environment-variables-reference)).

For local development, the defaults work out of the box:

```env
DATABASE_URL="file:./db/custom.db"
AUTH_SECRET="dev-secret-change-in-production"
NODE_ENV="development"
```

### 4. Generate Prisma Client & Push Schema

```bash
bun run db:generate
bun run db:push
```

This creates the SQLite database file at `db/custom.db` and synchronizes the schema.

### 5. Seed the Database

```bash
bun run seed
```

This creates demo roles, users, competitions, and sample data. See [Seed Data](#seed-data) for details.

### 6. Start the Development Server

```bash
bun run dev
```

The app runs at `http://localhost:3000`.

---

## Environment Variables Reference

All environment variables are configured in `.env.local` for local development or in the **Vercel Environment Variables** dashboard for production.

### Complete Variable Table

| Variable | Required | Category | Description | Example (Development) | Example (Production) |
|----------|----------|----------|-------------|----------------------|---------------------|
| `DATABASE_URL` | Yes | Database | Database connection string | `file:./db/custom.db` | `postgresql://user:pass@ep-xxx.region.aws.neon.tech/essaycomp?sslmode=require` |
| `AUTH_SECRET` | Yes | Auth | NextAuth.js session encryption secret | `dev-secret-change-me` | (generated with `openssl rand -base64 32`) |
| `RAZORPAY_KEY_ID` | Yes* | Payment | Razorpay API key ID | `rzp_test_xxxxxxxxxxxxxxx` | `rzp_live_abc123def456` |
| `RAZORPAY_KEY_SECRET` | Yes* | Payment | Razorpay API key secret | `test_secret_xxxxxxxxxx` | `live_secret_xxxxxxxxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | Yes* | Payment | Razorpay webhook signature secret | `test_webhook_secret` | `prod_webhook_secret` |
| `RESEND_API_KEY` | Yes* | Email | Resend API key | `re_xxxxxxxxxxxxx` | `re_live_xxxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | Yes* | Email | Sender email address | `onboarding@resend.dev` | `noreply@yourdomain.com` |
| `RESEND_FROM_NAME` | No | Email | Sender display name | `EssayComp Dev` | `Essay Competition` |
| `CLOUDINARY_CLOUD_NAME` | Yes* | Storage | Cloudinary cloud name | `your-cloud-name` | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Yes* | Storage | Cloudinary API key | `123456789012345` | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Yes* | Storage | Cloudinary API secret | `abcdef1234567890` | `abcdef1234567890` |
| `CLOUDINARY_UPLOAD_FOLDER` | No | Storage | Upload folder in Cloudinary | `essays` | `essays/prod` |
| `NEXT_PUBLIC_APP_URL` | Yes | App | Public application URL | `http://localhost:3000` | `https://essaycomp.vercel.app` |
| `NODE_ENV` | No | App | Node environment | `development` | `production` |

> \* Required for production. In development, payment and email features use mock implementations.

### Generating an AUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output and set it as `AUTH_SECRET`. Use a **different secret** for each environment (dev, staging, production).

### Security Notes

- **NEVER** commit `.env` or `.env.local` to version control. Only `.env.example` is tracked.
- The `.gitignore` includes patterns for `.env*` files (except `.env.example`).
- `NEXT_PUBLIC_*` variables are exposed to the browser. Only non-sensitive values should use this prefix.

---

## Database Setup

### Development: SQLite

The default database for local development is **SQLite**, stored as a local file:

```env
DATABASE_URL="file:./db/custom.db"
```

- **Location**: `db/custom.db` (relative to `prisma/schema.prisma`).
- **Prisma provider**: `sqlite`.
- **Advantages**: Zero setup, fast, file-based, easy to reset.
- **Limitations**: No concurrent connections from multiple server instances.

The database file is automatically created on first `prisma db push` or `prisma migrate dev`.

### Production: Neon PostgreSQL

For production deployment on Vercel, use **Neon PostgreSQL**:

```env
DATABASE_URL="postgresql://essaycomp_user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/essaycomp?sslmode=require"
```

- **Location**: Managed cloud database on Neon's infrastructure.
- **Prisma provider**: `postgresql` (must change `prisma/schema.prisma` before deploy).
- **Connection pooling**: Neon supports connection pooling via `?sslmode=require` and PgBouncer.

> **Important**: When switching from SQLite to PostgreSQL for deployment, update the `provider` in `prisma/schema.prisma` from `"sqlite"` to `"postgresql"`. This change should be committed to the deployed branch.

---

## Database Migration

### Development (SQLite)

```bash
# Push schema changes directly (fast, no migration files)
bun run db:push

# Regenerate Prisma client after schema changes
bun run db:generate
```

The `db:push` command maps to `prisma db push --accept-data-loss`. This is suitable for development where data loss is acceptable.

### Production (PostgreSQL)

```bash
# Create a migration
bun run db:migrate

# This maps to: prisma migrate dev --name descriptive_name
```

Migration workflow for production:

1. Make schema changes in `prisma/schema.prisma`.
2. Run `prisma migrate dev --name describe-change` locally against a Neon branch.
3. Review the generated migration SQL in `prisma/migrations/`.
4. Test the migration against production-like data.
5. Commit the migration files.
6. Deploy to Vercel — Prisma migrations run automatically during build if configured.

> **Warning**: `db:push` should NEVER be used against a production database. Always use `prisma migrate` for production schema changes.

### Resetting the Database

```bash
# Drops all data and re-applies schema + seed
bun run db:reset
```

> This will **delete all data**. Only use in development.

---

## Seed Data

### Running the Seed

```bash
bun run seed
```

This executes `prisma/seed.ts` which creates:

| Data | Details |
|------|---------|
| **Roles** | SUPER_ADMIN, ADMIN, TEACHER, STUDENT, EXAMINER |
| **Super Admin** | `admin@essaycomp.com` / `admin123` |
| **Admin** | `manager@essaycomp.com` / `manager123` |
| **Teacher** | `teacher@essaycomp.com` / `teacher123` |
| **Students** | 5 sample students with profiles |
| **Examiners** | 3 sample examiners with profiles |
| **Competitions** | 2 sample competitions with categories and criteria |
| **Registrations** | Sample registrations for the students |
| **Payments** | Sample successful payments |
| **Essay Submissions** | Sample essay submissions |
| **Scoring Configs** | Evaluation configurations per competition |
| **Announcements** | Sample announcements |
| **System Settings** | Default configuration values |

### Development Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@essaycomp.com` | `admin123` |
| Admin | `manager@essaycomp.com` | `manager123` |
| Teacher | `teacher@essaycomp.com` | `teacher123` |
| Student 1 | `student1@example.com` | `student123` |
| Student 2 | `student2@example.com` | `student123` |
| Examiner 1 | `examiner1@example.com` | `examiner123` |

> ⚠️ **NEVER use these credentials in production.** The seed script should only be run in development. Production data should be created through the application UI.

---

## Vercel Deployment Steps

### Step 1: Connect Repository

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
3. Click **"Add New" → "Project"**.
4. Import your repository.
5. Vercel auto-detects **Next.js** as the framework.

### Step 2: Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `npm run build` (or `bun run build`) |
| Output Directory | `.next` |
| Install Command | `npm install` (or `bun install`) |

> Vercel auto-detects these settings. Verify they are correct.

### Step 3: Set Environment Variables

In the Vercel project **Settings → Environment Variables**, add all variables from the [Environment Variables Reference](#environment-variables-reference) table:

1. Set `NODE_ENV` to `production`.
2. Set `DATABASE_URL` to your Neon connection string.
3. Set `AUTH_SECRET` to a strong random value.
4. Set all Razorpay, Resend, and Cloudinary credentials.
5. Set `NEXT_PUBLIC_APP_URL` to your production URL.

**Environment scopes**: Set different values for Production, Preview, and Development environments as needed.

### Step 4: Configure Domain

1. In Vercel project **Settings → Domains**.
2. Add your custom domain (e.g., `essaycomp.yourschool.edu.in`).
3. Configure DNS records (see [DNS Configuration](#dns-configuration)).
4. Vercel automatically provisions an SSL certificate.

### Step 5: Deploy

1. Click **"Deploy"** or push to the `main` branch.
2. Monitor the build logs for errors.
3. After successful deployment, visit your production URL.

### Step 6: Run Migrations (First Deploy)

On the first deployment, run Prisma migrations against the production database:

```bash
# From your local machine, pointing to the production DATABASE_URL
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Step 7: Verify

- [ ] Home page loads correctly.
- [ ] Login works with a real account.
- [ ] Registration and payment flow completes.
- [ ] Essay upload works.
- [ ] Email notifications are received.
- [ ] Razorpay webhook is reachable.

---

## Neon PostgreSQL Setup

### 1. Create a Neon Project

1. Sign up at [neon.tech](https://neon.tech/).
2. Click **"Create Project"**.
3. Choose a region closest to your users (e.g., `us-east-2` for India).
4. Set a database name (e.g., `essaycomp`).

### 2. Get Connection String

After creation, Neon provides a connection string:

```
postgresql://essaycomp_owner:abc123def@ep-cool-name-123456.us-east-2.aws.neon.tech/essaycomp?sslmode=require
```

### 3. Connection Pooling

Neon uses **connection pooling** by default. For serverless environments like Vercel, this is essential:

- Use the **pooled connection string** (includes `-pooler` in the hostname) for the Vercel `DATABASE_URL`.
- Use the **direct connection string** for running migrations (`prisma migrate deploy`).

```env
# For Vercel (pooled — used by the application)
DATABASE_URL="postgresql://essaycomp_owner:abc123@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/essaycomp?sslmode=require"

# For migrations (direct — used by prisma migrate)
# DATABASE_URL="postgresql://essaycomp_owner:abc123@ep-cool-name-123456.us-east-2.aws.neon.tech/essaycomp?sslmode=require"
```

### 4. Branching (Development)

Neon supports **database branching** — create a branch for staging/testing:

```bash
# Create a branch from the Neon CLI
neon branches create --name staging
```

Each branch gets its own connection string. Use the staging branch URL for Vercel Preview deployments.

---

## Razorpay Setup

### 1. Create Account

1. Sign up at [razorpay.com](https://razorpay.com/).
2. Complete KYC verification (required for live mode).
3. For development, test mode works without KYC.

### 2. Get API Keys

1. Navigate to **Settings → API Keys**.
2. Generate a key pair.
3. Copy the **Key ID** (`rzp_test_...`) and **Key Secret**.

### 3. Test Mode

- Test mode is enabled by default for new accounts.
- Test payments use simulated amounts (no real money is charged).
- Use test card numbers provided in the [Razorpay Test Documentation](https://razorpay.com/docs/payments/payment-gateway/test-card-numbers/).

### 4. Configure Webhook Endpoint

1. Navigate to **Settings → Webhooks**.
2. Click **"Add Endpoint"**.
3. Enter the URL:

```
https://your-domain.vercel.app/api/payments?action=webhook
```

4. Select events to capture:
   - `payment.captured`
   - `payment.failed`
5. Save and copy the **Webhook Secret**.

### 5. Set Environment Variables

```env
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
```

> **Going Live**: When ready for production, toggle to live mode in the Razorpay dashboard, generate new keys, and update the environment variables.

---

## Resend Email Setup

### 1. Create Account

1. Sign up at [resend.com](https://resend.com/).
2. Verify your email address.

### 2. Verify Domain (Production)

For production emails (not `@resend.dev`), verify your domain:

1. Navigate to **Domains → Add Domain**.
2. Enter your domain (e.g., `yourdomain.com`).
3. Add the DNS records shown to your domain's DNS configuration:

| Type | Name | Value |
|------|------|-------|
| `MX` | `send` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
| `TXT` | `send` | `v=spf1 include:amazonses.com ~all` |
| `CNAME` | `resend._domainkey.send` | `(provided by Resend)` |

4. Click **"Verify DNS Records"**.

### 3. Get API Key

1. Navigate to **API Keys → Create API Key**.
2. Copy the key (starts with `re_`).

### 4. Configure Sender

```env
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="Essay Competition"
```

> **Development**: You can use `onboarding@resend.dev` as the sender email without domain verification. This is limited to your own verified email address as a recipient.

---

## Cloudinary Setup

### 1. Create Account

1. Sign up at [cloudinary.com](https://cloudinary.com/).
2. Choose a cloud name (becomes part of your URL).

### 2. Get Credentials

1. Navigate to **Dashboard** (or **Settings → API Keys**).
2. Copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 3. Configure Upload Preset

For essay uploads, configure an **unsigned** or **signed** upload preset:

1. Navigate to **Settings → Upload**.
2. Click **"Add Upload Preset"**.
3. Configure:
   - **Upload preset name**: `essay_uploads`
   - **Signing mode**: `Signed` (recommended for security)
   - **Allowed formats**: `pdf`
   - **Max file size**: `5MB` (5000000 bytes)
   - **Folder**: `essays`

### 4. Signed Upload for Essays

The system uses **signed uploads** for essay PDFs to prevent unauthorized uploads:

```typescript
// Server-side signature generation
import { v2 as cloudinary } from 'cloudinary';

const signature = cloudinary.utils.api_sign_request(
  {
    timestamp: Math.floor(Date.now() / 1000),
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'essays',
  },
  process.env.CLOUDINARY_API_SECRET!
);
```

### 5. Set Environment Variables

```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="abcdef1234567890"
CLOUDINARY_UPLOAD_FOLDER="essays"
```

---

## DNS Configuration

### For Custom Domain with Vercel

If using a custom domain (e.g., `essaycomp.yourschool.edu.in`):

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `essaycomp` | `cname.vercel-dns.com` |

> For apex domain (root domain), use an `A` record pointing to `76.76.21.21`.

### DNS Records for Resend (Email)

See [Resend Email Setup](#resend-email-setup) above for the MX, TXT, and CNAME records required.

### DNS Propagation

DNS changes can take up to **48 hours** to propagate, though typically resolve within **15 minutes** to **1 hour**.

Verify DNS with:

```bash
# Check CNAME
dig essaycomp.yourschool.edu.in CNAME

# Check MX records
dig send.yourdomain.com MX
```

---

## Monitoring & Logging

### Vercel Logs

Vercel provides real-time logs for serverless functions:

1. Navigate to your project in the Vercel Dashboard.
2. Click the **"Logs"** tab.
3. Filter by function name (e.g., `api/payments`).
4. Logs are streamed in real-time and retained for 24 hours (Hobby plan).

### Audit Trail

The application maintains a comprehensive audit trail in the `AuditLog` table:

- **All payment operations**: Order creation, verification, refunds.
- **User management**: Account creation, role changes, profile updates.
- **Competition operations**: Creation, status changes, criteria updates.
- **Examination operations**: Assignment, evaluation submission, result publication.

Access audit logs via the Admin dashboard at **Admin → Audit Logs** (requires `AUDIT_VIEW` permission).

### Application Monitoring

For production, consider adding:

| Tool | Purpose | Free Tier |
|------|---------|-----------|
| [Vercel Analytics](https://vercel.com/analytics) | Web analytics, Core Web Vitals | Yes (Hobby) |
| [Sentry](https://sentry.io/) | Error tracking, performance | 5K errors/month |
| [Upstash Redis](https://upstash.com/) | Rate limiting, caching | 10K commands/day |

---

## Scaling Considerations

### When to Upgrade from Free Tiers

| Service | Free Tier Limit | Upgrade Signal |
|---------|----------------|----------------|
| **Vercel** | 100 GB bandwidth/month | Traffic exceeds ~50K page views/month |
| **Neon** | 0.5 GB storage, 0.5 vCPU | Database > 400MB, or slow queries during peak |
| **Resend** | 100 emails/day | Need to send bulk notifications or > 100 registrations/day |
| **Cloudinary** | 25 GB storage, 25 GB bandwidth | > 5000 essay PDFs uploaded |
| **Razorpay** | Test mode (no real payments) | Going live with real transactions |

### Neon Branching

Use Neon's branching feature for:

- **Preview deployments**: Each Vercel Preview deployment uses a database branch.
- **Staging environment**: Long-lived branch for QA testing.
- **Data anonymization**: Branch with anonymized data for development.

### Vercel Pro Features

Upgrade from Hobby to Pro ($20/month) when you need:

- **Custom domain** with automatic SSL (multiple domains).
- **1 TB bandwidth** (vs 100 GB).
- **99.99% SLA**.
- **Team collaboration** (multiple team members).
- **Advanced analytics** with longer retention.
- **Password-protected preview deployments**.
- **Priority support**.

---

## Free Tier Limitations

### Neon PostgreSQL

| Resource | Free Tier | Pro Tier ($19/mo) |
|----------|-----------|-------------------|
| Storage | 0.5 GB | 10 GB (scaleable) |
| Compute | 0.5 vCPU | Full vCPU (scaleable) |
| Branches | 1 branch | Unlimited |
| Connection pooling | Yes | Yes |
| Auto-suspend | After 5 min idle | Configurable |

### Resend Email

| Resource | Free Tier | Pro Tier ($20/mo) |
|----------|-----------|-------------------|
| Emails/day | 100 | 50,000 |
| Domains | 1 | Unlimited |
| Team members | 1 | 5 |

### Cloudinary

| Resource | Free Tier | Pro Tier ($89/mo) |
|----------|-----------|-------------------|
| Storage | 25 GB | 100 GB |
| Bandwidth | 25 GB | 100 GB |
| Transformations | 25,000/month | Unlimited |

### Vercel

| Resource | Hobby (Free) | Pro ($20/mo) |
|----------|-------------|--------------|
| Bandwidth | 100 GB | 1 TB |
| Serverless execution | 100 GB-hours | 1000 GB-hours |
| Builds | 6000 min/month | 6000 min/month |
| Team members | 1 | 5 |
| Custom domains | 1 | Unlimited |
| SLA | 99.95% | 99.99% |

---

## Troubleshooting Common Issues

### Build Failures

| Error | Cause | Solution |
|-------|-------|----------|
| `Prisma Client not generated` | Missing `prisma generate` step | Ensure `prisma generate` runs in `postinstall` or build command |
| `Module not found: @prisma/client` | Dependencies not installed | Run `bun install` and redeploy |
| `TypeScript compilation error` | Type mismatch after schema change | Run `bun run db:generate` locally and commit generated files |

### Database Connection Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused` | Wrong `DATABASE_URL` | Verify connection string format and credentials |
| `SSL required` | Missing `sslmode=require` | Append `?sslmode=require` to Neon connection string |
| `Too many connections` | No connection pooling | Use Neon's pooled connection string (`-pooler` hostname) |
| `Database does not exist` | First deployment without migration | Run `npx prisma migrate deploy` against the production database |

### Payment Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid payment signature` | Wrong `RAZORPAY_KEY_SECRET` | Verify secret matches the key ID in Razorpay dashboard |
| `Webhook not received` | URL not configured or blocked | Verify webhook URL in Razorpay dashboard; check Vercel logs for 4xx errors |
| `Amount mismatch` | Fee changed after order created | This is logged as `AMOUNT_MISMATCH` in audit logs — review manually |
| `Order not found in webhook` | Webhook for a deleted/cancelled order | Safe to ignore — idempotent handling returns 200 |

### Email Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Domain not verified` | DNS records not configured | Add MX, TXT, and CNAME records from Resend dashboard |
| `Email not received` | Recipient email filtered | Check spam folder; verify sender domain reputation |
| `Rate limit exceeded` | >100 emails/day on free tier | Upgrade Resend plan or batch notifications |

### File Upload Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Upload failed` | Invalid Cloudinary credentials | Verify `CLOUDINARY_CLOUD_NAME`, `API_KEY`, and `API_SECRET` |
| `File too large` | Exceeds 5 MB limit | Reduce file size; the limit is configurable per competition (`maxEssayFileSizeMB`) |
| `Invalid file format` | Not a PDF | Only `application/pdf` is accepted (`allowedFileFormats`) |
| `Unsigned upload rejected` | Using unsigned preset with signed upload | Configure a signed upload preset in Cloudinary |

### Authentication Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid session` | `AUTH_SECRET` changed | Users must re-login after secret rotation |
| `Session expired` | Default session duration | Sessions expire after a configurable period; users re-authenticate automatically |
| `CSRF token mismatch` | Cookie domain mismatch | Ensure `NEXT_PUBLIC_APP_URL` matches the actual domain |

---

## Quick Reference: Deployment Checklist

```markdown
Pre-Deployment
- [ ] All environment variables set in Vercel
- [ ] Prisma schema uses `postgresql` provider
- [ ] Migrations committed to the repository
- [ ] `next build` succeeds locally
- [ ] Test mode payment flow works

Deployment
- [ ] Repository connected to Vercel
- [ ] Build settings configured (Next.js)
- [ ] Domain configured and DNS propagated
- [ ] Database migrations deployed
- [ ] Webhook endpoint configured in Razorpay
- [ ] Email domain verified in Resend
- [ ] Cloudinary upload preset configured

Post-Deployment
- [ ] Login works with real accounts
- [ ] Payment flow completes end-to-end
- [ ] Essay upload and download works
- [ ] Email notifications are delivered
- [ ] Razorpay webhook is receiving events
- [ ] Admin dashboard shows correct data
- [ ] Audit logs are recording actions
```

---

*This document is part of the Essay Writing Competition Management System documentation set. See also: [DATABASE.md](./DATABASE.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PAYMENTS.md](./PAYMENTS.md), [SECURITY.md](./SECURITY.md).*
