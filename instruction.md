
---

## 🔥 PROMPT COMPLET – PLATEFORME DE PLACEMENT LOCAL (CÔTE D’IVOIRE)

### 🎯 CONTEXTE GÉNÉRAL

Tu es un  **développeur full-stack senior** , spécialisé en **React.js** pour le frontend et **Node.js / Express** pour le backend.
Tu dois créer une **plateforme web professionnelle sous le nom de "NUNDO" de mise en relation travailleurs/recruteurs** (type Upwork local), adaptée à la  **Côte d’Ivoire** .

La plateforme met en relation :

* **Travailleurs locaux** (servante, chauffeur, gérant de bar, vigile, secrétaire, commercial…)
* **Recruteurs** (particuliers ou entreprises)

Elle doit être  **scalable, rapide, sécurisée, responsive et premium** .

---

## 🎨 DESIGN SYSTEM

* **MCP : Shadcn/UI**
* **Typographie : Poppins** (poids 300/400/500/600/700)
* **Palette drapeau ivoirien :**
  * Orange : #F77F00 (CTA, actions principales)
  * Blanc : #FFFFFF (fond, lisibilité)
  * Vert : #009E60 (succès, validation)
  * Gris neutre pour textes secondaires
  * Noir doux #1E1E1E pour textes principaux
* **Animations premium :**
  * Framer Motion pour transitions pages / hover / loader
  * Micro-interactions fluides
  * LottieFiles pour animations spécifiques (loader, badges…)
* **Icônes professionnelles : Lucide Icons / Heroicons**

---

## 🧱 ARCHITECTURE FRONTEND (REACT.JS + SHADCN/UI)

```bash
src/
├── api/                   # appels API backend
│   ├── auth.api.js
│   ├── users.api.js
│   ├── jobs.api.js
│   ├── applications.api.js
│   └── payments.api.js
├── assets/
│   ├── icons/
│   ├── images/
│   └── logos/
├── components/
│   ├── common/            # boutons, inputs, modal, badge
│   ├── layout/            # Navbar, Sidebar, Footer, MainLayout
│   └── cards/             # JobCard, WorkerCard, RecruiterCard
├── context/               # AuthContext, UserContext, ThemeContext
├── hooks/                 # useAuth, useFetch, useDebounce, usePermissions
├── pages/
│   ├── auth/              # Login, Register, VerifyOTP
│   ├── public/            # Home, Jobs, Workers, JobDetails
│   └── dashboard/         # Dashboard, Profile, Applications, Settings
├── routes/                # AppRoutes.jsx
├── styles/                # global.css, variables.css, components.css
├── utils/                 # constants.js, validators.js, formatters.js
├── App.jsx
├── main.jsx
└── index.css
```

---

## 🧠 ARCHITECTURE BACKEND (NODE.JS / EXPRESS + POSTGRESQL)

### 📂 Structure

```bash
server/
├── controllers/
│   ├── auth.controller.js
│   ├── users.controller.js
│   ├── jobs.controller.js
│   ├── applications.controller.js
│   └── payments.controller.js
├── models/                 # Sequelize / TypeORM models
│   ├── User.js
│   ├── Job.js
│   ├── Application.js
│   └── Payment.js
├── routes/
│   ├── auth.routes.js
│   ├── users.routes.js
│   ├── jobs.routes.js
│   ├── applications.routes.js
│   └── payments.routes.js
├── middlewares/
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   └── validate.middleware.js
├── utils/
│   ├── jwt.js
│   ├── validators.js
│   └── notifications.js
├── config/
│   ├── db.config.js
│   └── env.js
├── server.js
└── app.js
```

### 🔑 Fonctionnalités backend

* Auth JWT + OTP téléphone
* Création / modification profils travailleurs et recruteurs
* CRUD annonces / jobs / candidatures
* Gestion badges / vérifications
* Chat interne (message simple)
* Historique / statistiques / dashboards admin
* Intégration Mobile Money (Orange Money / MTN / Wave)
* Pagination, filtres, recherche avancée
* Sécurité et validations strictes (input, injections, XSS)

---

## 🧩 FONCTIONNALITÉS CLÉS (FULL STACK)

### 👤 Comptes

* Travailleur : création profil, photo, catégorie métier, badge vérification, disponibilité, salaire
* Recruteur : création profil, validation entreprise, publication annonces, recherche profils
* Admin : dashboard complet, gestion utilisateurs, validation badges

### 💬 Interactions

* Chat interne entre recruteur et travailleur
* Notifications temps réel (nouvelle candidature, message, validation)

### 📌 Backend / Frontend intégration

* API REST sécurisée
* Frontend Shadcn/UI consomme l’API
* Auth JWT avec refresh token
* Responsive & mobile first

---

## ⚡ PERFORMANCE & OPTIMISATION

* React : lazy loading, code splitting, memoization
* Backend : requêtes SQL optimisées, pagination côté serveur
* Mobile Money : endpoints sécurisés
* Images & assets : chargement différé
* Architecture scalable (frontend + backend séparé)

---

## 📱 RESPONSIVE & UX

* Mobile first
* Sidebar adaptative
* Transitions fluides avec Framer Motion
* Cartes et boutons interactifs
* UX intuitive pour travailleurs et recruteurs

---

## 💵 BUSINESS / MONÉTISATION

* Abonnement recruteur (gratuit / premium)
* Frais sur placement réussi
* Boost profil / badge vérification payant
* Service premium agences / entreprises

---

Ce prompt est **clé en main** pour générer un  **MVP complet** , frontend + backend, prêt pour  **déploiement en Côte d’Ivoire** , responsive, avec  **animations premium et design Shadcn/UI** , couleurs ivoiriennes orange, blanc et vert, Poppins et intégration Mobile Money.

---
