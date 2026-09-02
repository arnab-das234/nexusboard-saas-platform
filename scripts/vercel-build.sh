#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NexusBoard - Vercel Auto-Build Script
# ═══════════════════════════════════════════════════════════════
# This script runs automatically on every Vercel deployment.
# It handles:
#   1. Auto-detect PostgreSQL and swap Prisma provider
#   2. Generate Prisma client
#   3. Push schema to Neon (creates/updates tables)
#   4. Auto-seed if database is empty (preserves existing data)
#   5. Build the Next.js application
# ═══════════════════════════════════════════════════════════════
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       NexusBoard - Vercel Auto-Build & Deploy              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Auto-detect database and swap provider ──────────────
echo "📡 Step 1: Detecting database type..."
if [[ "$DATABASE_URL" == postgresql* ]] || [[ "$DATABASE_URL" == postgres* ]]; then
  echo "   ✅ PostgreSQL detected (Neon)"
  echo "   🔄 Swapping Prisma provider: sqlite → postgresql"
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  echo "   ✅ Provider swapped"
else
  echo "   ℹ️  SQLite detected (local development)"
fi
echo ""

# ── Step 2: Generate Prisma client ──────────────────────────────
echo "📦 Step 2: Generating Prisma client..."
npx prisma generate
echo "   ✅ Prisma client generated"
echo ""

# ── Step 3: Push schema to database ─────────────────────────────
echo "🗄️  Step 3: Syncing schema to database..."
npx prisma db push --accept-data-loss 2>&1 | sed 's/^/   /'
echo "   ✅ Schema synced"
echo ""

# ── Step 4: Auto-seed if database is empty ─────────────────────
echo "🌱 Step 4: Checking if database needs seeding..."
npx tsx scripts/auto-seed.ts
echo ""

# ── Step 5: Build Next.js ──────────────────────────────────────
echo "🏗️  Step 5: Building Next.js application..."
npx next build
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       ✅ Build complete! Ready for deployment.             ║"
echo "╚══════════════════════════════════════════════════════════════╝"