#!/bin/sh
set -eu

npx prisma db push --accept-data-loss --skip-generate
npm run seed
node dist/src/main.js
