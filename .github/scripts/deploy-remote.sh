#!/usr/bin/env bash
# Script exécuté sur le VPS par .github/workflows/deploy.yml (via SSH).
set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH manquant}"
: "${IMAGE_TAG:?IMAGE_TAG manquant}"
: "${REPOSITORY:?REPOSITORY manquant}"

cd "$DEPLOY_PATH"

if [ ! -f .env ]; then
  echo "ERREUR: $DEPLOY_PATH/.env manquant (POSTGRES_PASSWORD, JWT_SECRET, etc.)." >&2
  exit 1
fi

export NUNDO_SERVER_IMAGE="ghcr.io/$REPOSITORY/nundo-server:$IMAGE_TAG"
export NUNDO_FRONTEND_IMAGE="ghcr.io/$REPOSITORY/nundo-frontend:$IMAGE_TAG"

compose=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

"${compose[@]}" pull
"${compose[@]}" up -d --no-build --remove-orphans --wait --wait-timeout 180

"${compose[@]}" exec -T server node -e '
  fetch("http://127.0.0.1:4000/health")
    .then((r) => r.json())
    .then((h) => {
      console.log(h);
      if (h.status !== "ok" || h.db !== "ok") process.exit(1);
    })
    .catch((e) => { console.error(e); process.exit(1); });
'

"${compose[@]}" exec -T frontend wget -qO /dev/null http://127.0.0.1/api/jobs

echo "Déploiement OK — $IMAGE_TAG"
