# NUNDO – Personnes connectées et accès

## 1. Personnes « connectées »

L’application ne garde **pas** de liste en temps réel des utilisateurs connectés.  
Une personne est considérée comme **connectée** dès qu’elle a un **token JWT valide** (en général après connexion ou inscription). Le token est stocké côté frontend (localStorage, clé `nundo_auth`) et envoyé dans l’en-tête `Authorization: Bearer <token>` à chaque requête protégée.

- **Qui peut se connecter ?** Tout utilisateur inscrit avec un **téléphone** et un **mot de passe**, avec un rôle **worker** ou **recruiter**.
- **Où sont stockés les comptes ?** En base (PostgreSQL) si `DATABASE_URL` est défini, sinon en mémoire (tableau `usersMem` côté serveur).

Pour avoir une vraie « liste des connectés » (qui est en ligne maintenant), il faudrait ajouter un suivi de présence (ex. Socket.IO : connexion/déconnexion par utilisateur).

---

## 2. Rôles

| Rôle        | Description |
|------------|-------------|
| **worker** | Travailleur qui cherche une mission, postule, discute avec les recruteurs. |
| **recruiter** | Recruteur qui publie des offres, reçoit les candidatures, accepte des candidats, discute avec les travailleurs. |
| **admin** | Administrateur : accès au tableau de bord admin (liste des utilisateurs, statistiques, courbe d’inscriptions). Compte créé par seed (pas d’inscription publique). |

Le rôle est fixé à l’**inscription** (sauf admin, créé par défaut) et est inclus dans le JWT (`id`, `phone`, `role`).

---

## 3. Accès par page (frontend)

| Route | Accès | Rôle requis |
|-------|--------|-------------|
| `/` | Tout le monde | — |
| `/jobs` | Tout le monde | — |
| `/jobs/:id` | Tout le monde | — |
| `/auth/login` | Non connecté (sinon redirigé) | — |
| `/auth/register` | Tout le monde | — |
| `/dashboard/worker` | Connecté **worker** uniquement | `worker` |
| `/dashboard/recruiter` | Connecté **recruiter** uniquement | `recruiter` |
| `/dashboard/admin` | Connecté **admin** uniquement | `admin` |
| `/chat` | Connecté worker **ou** recruiter | `worker` ou `recruiter` |

- Lien **« Trouver une mission »** dans la nav : visible pour les non connectés et pour les **workers**.
- **« Mon espace »** : lien vers `/dashboard/worker` ou `/dashboard/recruiter` selon le rôle.
- **Messages** : accessible à tous les connectés (worker et recruiter).

---

## 4. Accès par API (backend)

Les routes marquées « Auth » exigent l’en-tête `Authorization: Bearer <token>` (JWT valide). Le `req.user` contient `{ id, phone, role }`.

### Auth (`/api/auth`)

| Méthode | Route | Accès | Rôle |
|---------|--------|--------|------|
| POST | `/register` | Tout le monde | — |
| POST | `/login` | Tout le monde | — |
| GET | `/me` | Auth | Tous |

### Jobs (`/api/jobs`)

| Méthode | Route | Accès | Rôle |
|---------|--------|--------|------|
| GET | `/` | Tout le monde | — |
| GET | `/:id` | Tout le monde | — |
| GET | `/recruiter/me` | Auth | **recruiter** uniquement |
| POST | `/` | Auth | **recruiter** uniquement |
| PATCH | `/:id` | Auth | **recruiter** (propriétaire du job) |

### Candidatures (`/api/applications`)

| Méthode | Route | Accès | Rôle |
|---------|--------|--------|------|
| GET | `/` | Auth | **recruiter** (voit ses candidatures) |
| GET | `/me` | Auth | **worker** (voit ses candidatures) |
| POST | `/` | Auth | **worker** uniquement |
| POST | `/:id/accept` | Auth | **recruiter** (propriétaire du job) |
| GET | `/:id` (détail + messages) | Auth | **recruiter** ou **worker** (lié à la candidature) |
| POST | `/:id/messages` | Auth | **recruiter** ou **worker** (lié à la candidature) |

### Admin (`/api/admin`) — réservé au rôle `admin`

| Méthode | Route | Accès | Rôle |
|---------|--------|--------|------|
| GET | `/users` | Auth + admin | **admin** (liste utilisateurs : id, nom, rôle, téléphone masqué, date) |
| GET | `/stats` | Auth + admin | **admin** (stats par rôle et inscriptions par jour) |

### Utilisateurs (`/api/users`)

| Méthode | Route | Accès | Rôle |
|---------|--------|--------|------|
| GET | `/:id` | Auth | Tous (profil public) |
| PATCH | `/me` (profil) | Auth | Tous (propre profil) |

---

## 5. Résumé par rôle

- **Worker**  
  - Peut : s’inscrire, se connecter, voir les offres, postuler, voir ses candidatures, accéder au chat avec les recruteurs, modifier son profil.  
  - Ne peut pas : publier des offres, voir les candidatures des autres, accepter des candidats.

- **Recruiter**  
  - Peut : s’inscrire, se connecter, publier des offres, voir les candidatures sur ses offres, accepter des candidats, accéder au chat avec les travailleurs, modifier son profil.  
  - Ne peut pas : postuler aux offres, voir les candidatures des autres recruteurs.

Si tu veux, on peut ajouter une page ou un endpoint « liste des utilisateurs connectés en ce moment » (avec Socket.IO ou un autre mécanisme de présence).
