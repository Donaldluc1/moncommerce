#!/usr/bin/env bash
# Déploiement du backend sur le serveur — exécuté via SSH par GitHub Actions
# (utilisable aussi à la main : bash deploy/remote-deploy.sh depuis le dossier déployé).
#
# Invariants préservés : image et conteneur "app_commerce_backend", port 3002,
# aucun volume monté, base PostgreSQL existante (DATABASE_URL du .env serveur).
set -euo pipefail

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Se placer dans le dossier backend déployé (celui qui contient docker-compose.yml)
cd "$(dirname "$0")/.."
log "Dossier de déploiement : $(pwd)"

# Le .env de production vit sur le serveur, jamais dans le repo ni dans l'image
if [[ ! -f .env ]]; then
  log "ERREUR : .env absent dans $(pwd)."
  log "Créez-le une fois sur le serveur (variables : voir .env.example) puis relancez."
  exit 1
fi

# docker compose v2 (plugin) ou docker-compose v1
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  log "ERREUR : ni 'docker compose' ni 'docker-compose' n'est disponible sur ce serveur."
  exit 1
fi

# Transition : supprime l'éventuel conteneur homonyme créé jadis par 'docker run'
# (compose refuserait le conflit de nom). Sans effet aux déploiements suivants.
docker rm -f app_commerce_backend >/dev/null 2>&1 || true

log "Build de l'image app_commerce_backend + recréation du conteneur…"
"${DC[@]}" up -d --build

log "Attente du healthcheck du conteneur (jusqu'à 120 s)…"
for i in $(seq 1 24); do
  status="$(docker inspect --format '{{.State.Health.Status}}' app_commerce_backend 2>/dev/null || echo absent)"
  if [[ "$status" == "healthy" ]]; then
    log "Backend healthy (contrôle $i/24) — déploiement réussi."
    docker ps --filter name=app_commerce_backend \
      --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
    exit 0
  fi
  log "  état : ${status} (contrôle $i/24)"
  sleep 5
done

log "ÉCHEC : le backend n'est pas healthy après 120 s. Derniers logs du conteneur :"
docker logs --tail 60 app_commerce_backend || true
exit 1
