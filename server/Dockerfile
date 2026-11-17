# NUNDO Backend — Node.js / Express
FROM node:20-alpine AS base

WORKDIR /app

# Dépendances
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Image finale
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
