# NUNDO - Plateforme de mise en relation (Côte d'Ivoire)

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

## Architecture

- **Frontend** : React + Vite, design system inspiré de Shadcn/UI, Poppins, palette ivoirienne (orange, blanc, vert), animations premium avec Framer Motion.
- **Backend** : Node.js / Express, endpoints REST mockés pour l'auth, les utilisateurs, les jobs, les candidatures et les paiements (Mobile Money à intégrer).

Les prochains ajouts pourront suivre la structure détaillée dans `instruction.md` (contextes, hooks, pages supplémentaires, intégration Mobile Money réelle, etc.).

