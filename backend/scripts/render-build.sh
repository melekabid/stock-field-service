#!/bin/sh
set -eu

npm ci --no-audit --no-fund
npx prisma generate
npm run build
