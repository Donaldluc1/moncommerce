# Backend gestion-commerce — image "app_commerce_backend" (nom historique conservé)
# Base Debian slim : compatible avec les moteurs Prisma (debian-openssl-3.0.x)
FROM node:20-slim

# openssl : requis par Prisma · curl : requis par le HEALTHCHECK
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances d'abord (cache de layers : réinstallées seulement si package*.json change).
# npm ci complet (pas --omit=dev) : le CLI prisma, en devDependencies, est nécessaire
# au démarrage pour "migrate deploy".
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

COPY src ./src

ENV NODE_ENV=production

# Port historique du conteneur en production (PORT=3002 dans le .env serveur)
EXPOSE 3002

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -fsS "http://localhost:${PORT:-3000}/" >/dev/null || exit 1

# Applique les migrations en attente puis démarre l'API
# (même comportement au boot que le conteneur historique : Prisma se connecte d'abord)
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
