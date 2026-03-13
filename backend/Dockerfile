FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json nest-cli.json ./
COPY prisma ./prisma
COPY assets ./assets
COPY src ./src

RUN npx prisma generate && npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && npm run seed && node dist/src/main.js"]
