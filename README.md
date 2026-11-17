# NUNDO - Plateforme de mise en relation (Côte d'Ivoire)

[![CI](https://github.com/christiandoh/Nundo/actions/workflows/ci.yml/badge.svg)](https://github.com/christiandoh/Nundo/actions/workflows/ci.yml)
[![CD — Images](https://github.com/christiandoh/Nundo/actions/workflows/cd.yml/badge.svg)](https://github.com/christiandoh/Nundo/actions/workflows/cd.yml)

NUNDO est une plateforme web type « Upwork local » qui met en relation **travailleurs** (servante, chauffeur, gérant de bar, vigile, secrétaire, commercial…) et **recruteurs** (particuliers, entreprises) en Côte d'Ivoire.

## Démarrer le projet

### 1. Installer les dépendances

```bash
cd NUNDO
npm install          # dépendances racine
cd frontend && npm install
cd ../server && npm install
```

### 2. Lancer les serveurs

Dans le dossier racine :

```bash
npm run dev         # frontend React (Vite)
npm run dev:server  # backend Express
```

Ou avec les deux en parallèle (nécessite `concurrently`, déjà installé) :

```bash
npm run dev:all
```

Si les ports par défaut sont déjà occupés, ils sont tous surchargeables par variable d'environnement :

```bash
PORT=4100 VITE_PORT=4180 VITE_API_URL=http://localhost:4100 npm run dev:all
```

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `4000` | Port du backend Express |
| `VITE_PORT` | `5173` | Port du serveur de dev Vite |
| `VITE_API_URL` | `http://localhost:4000` | Base URL de l'API utilisée par le frontend |

### 3. Lancer avec Docker

Environnement complet (PostgreSQL + backend + frontend) :

```bash
docker compose up -d
```

- **App** : http://localhost:3000  
- **API** : http://localhost:4000 (direct) ou via le proxy nginx sur le même domaine.

Variables optionnelles (fichier `.env` à la racine) :

- `JWT_SECRET` : secret JWT (défaut en dev Docker : `nundo-docker-secret-change-me`).

Arrêter : `docker compose down`. Données PostgreSQL : volume `nundo_pgdata`.

## Architecture

- **Frontend** : React + Vite, design system inspiré de Shadcn/UI, Poppins, palette ivoirienne (orange, blanc, vert), animations premium avec Framer Motion.
- **Backend** : Node.js / Express, endpoints REST mockés pour l'auth, les utilisateurs, les jobs, les candidatures et les paiements (Mobile Money à intégrer).

Les prochains ajouts pourront suivre la structure détaillée dans `instruction.md` (contextes, hooks, pages supplémentaires, intégration Mobile Money réelle, etc.).

## CI / CD

Trois workflows GitHub Actions dans `.github/workflows/` :

| Workflow | Déclencheur | Rôle |
|---|---|---|
| **CI** (`ci.yml`) | PR + push sur `main` | ESLint + build Vite ; syntaxe + smoke test du backend (mode mémoire) ; stack Docker complète (PostgreSQL + API + nginx) avec vérification de `/health` et du proxy `/api/jobs`. |
| **CD — Images** (`cd.yml`) | push sur `main`, tags `vX.Y.Z`, manuel | Build & push des images sur GHCR : `ghcr.io/<owner>/nundo-server` et `ghcr.io/<owner>/nundo-frontend` (tags `sha-*`, branche, semver, `latest` sur `main`). |
| **Deploy — Production** (`deploy.yml`) | manuel | Déploie un tag d'image sur un VPS via SSH, puis vérifie `/health` et le proxy nginx. |

En local : `npm run lint` (ESLint frontend), `npm run check` (lint + build).

### Déploiement VPS (première fois)

1. Sur le serveur : Docker + plugin Compose. Si les packages GHCR sont privés, se connecter une fois :
   `echo <PAT read:packages> | docker login ghcr.io -u <owner> --password-stdin`.
2. Créer `/opt/nundo/.env` avec au minimum :
   ```dotenv
   POSTGRES_USER=nundo
   POSTGRES_PASSWORD=<mot-de-passe-fort>
   POSTGRES_DB=nundo
   JWT_SECRET=<secret-long-et-aleatoire>
   ```
3. Dans **Settings → Secrets and variables → Actions**, ajouter :
   `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (clé privée ED25519), et optionnellement
   `DEPLOY_PORT` (défaut `22`) et `DEPLOY_PATH` (défaut `/opt/nundo`).
4. Lancer le workflow **Deploy — Production (VPS)** avec le tag souhaité (ex. `sha-abc1234` ou `latest`).

**Rollback** : relancer le workflow avec un tag `sha-*` antérieur. Les tags `sha-*` sont immuables et identifient chaque commit déployé.


