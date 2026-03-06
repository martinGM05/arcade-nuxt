#!/bin/sh
set -e

echo "Entry: PWD=$(pwd)"
echo "Entry: PORT=${PORT} NITRO_PORT=${NITRO_PORT} NUXT_PORT=${NUXT_PORT} HOST=${HOST} NITRO_HOST=${NITRO_HOST} NUXT_HOST=${NUXT_HOST} NODE_ENV=${NODE_ENV}"

if [ -d .output/server ]; then
  echo "Entry: .output/server contents:"
  ls -la .output/server | sed -n '1,120p'
else
  echo "Entry: .output/server missing"
fi

export PORT=${PORT:-3000}
export NITRO_PORT=${NITRO_PORT:-$PORT}
export NUXT_PORT=${NUXT_PORT:-$PORT}
export HOST=${HOST:-0.0.0.0}
export NITRO_HOST=${NITRO_HOST:-0.0.0.0}
export NUXT_HOST=${NUXT_HOST:-0.0.0.0}
export NODE_ENV=${NODE_ENV:-production}

echo "Entry: running prisma migrate deploy"
node ./node_modules/.bin/prisma migrate deploy

GAME_COUNT=$(node --input-type=module -e "
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const n = await prisma.game.count();
await prisma.\$disconnect();
await pool.end();
console.log(n);
" 2>/dev/null || echo 0)

if [ "$GAME_COUNT" = "0" ]; then
  echo "Entry: seeding database..."
  node ./node_modules/.bin/tsx prisma/seed.ts
else
  echo "Entry: seed skipped ($GAME_COUNT games already in DB)"
fi

echo "Entry: starting node .output/server/index.mjs"
exec node .output/server/index.mjs
