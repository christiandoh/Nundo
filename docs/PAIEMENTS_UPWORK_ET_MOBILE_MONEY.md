# Paiements façon Upwork + Mobile Money pour NUNDO

## 1. Comment fonctionnent les paiements Upwork ?

### Principe : l’**escrow** (séquestre)

Upwork utilise un **compte séquestre** : l’argent est déposé par le client et bloqué sur la plateforme tant que le travail n’est pas livré et approuvé.

### Flux simplifié

| Étape | Qui | Action |
|-------|-----|--------|
| 1 | **Client (recruteur)** | Met les fonds en escrow (avance) avant que le travail ne commence. |
| 2 | **Freelancer (travailleur)** | Fait le travail, marque la mission comme livrée. |
| 3 | **Client** | Reçoit le travail, a un délai (ex. 14 jours) pour approuver ou demander des modifications. |
| 4 | **Libération** | Si le client approuve (ou ne fait rien après 14 j), les fonds sont libérés vers le freelancer. |
| 5 | **Retrait** | Après un court délai de sécurité (ex. 5 j), le freelancer peut retirer l’argent. |

### Intérêt

- **Pour le travailleur** : l’argent est déjà réservé → moins de risque de non-paiement.
- **Pour le recruteur** : les fonds ne partent qu’après validation du travail (ou après le délai).
- **Pour la plateforme** : elle prélève une commission (ex. 10–20 %) sur chaque transaction.

---

## 2. Adapter ce modèle à NUNDO avec Mobile Money

En Côte d’Ivoire, on n’a pas de “wallet Upwork” : on utilise **Orange Money, MTN Mobile Money, Wave**. NUNDO utilise l’**agrégateur adullam.dev** pour la collecte (recruteur paie) et le transfert (vers le travailleur).

- **Collecte** : le recruteur paie via adullam.dev (Orange / MTN / Wave) ; les fonds arrivent sur le compte NUNDO.
- **Escrow métier** : en base de données, chaque placement a un enregistrement `escrow_payments` (pending_payment → funded → released).
- **Libération** : quand le recruteur confirme le placement (ou après délai), NUNDO déclenche un **disbursement** via adullam.dev vers le numéro Mobile Money du travailleur.

Le **flux métier** reste le même qu’Upwork :  
**Dépôt (recruteur) → Travail / placement → Validation → Libération vers le travailleur (Mobile Money).**

---

## 3. Flux proposé pour NUNDO (style Upwork + Mobile Money)

### Acteurs

- **Recruteur** : paie par Mobile Money (Orange / MTN / Wave).
- **Travailleur** : reçoit l’argent sur son numéro Mobile Money.
- **NUNDO** : encaisse la commission, gère le statut “en attente” / “libéré”.

### Étapes

| # | Étape | Détail technique / métier |
|---|--------|----------------------------|
| 1 | **Recruteur accepte un candidat** | Il clique “Valider ce travailleur” pour une candidature. |
| 2 | **Montant à déposer** | La plateforme affiche le montant : **salaire 1er mois (ou avance)** + **commission NUNDO** (ex. 10 %). Ex. 200 000 FCFA + 20 000 = 220 000 FCFA. |
| 3 | **Paiement Mobile Money** | Le recruteur choisit Orange / MTN / Wave, entre son numéro, valide. L’argent est **collecté** vers le compte marchand NUNDO (ou l’agrégateur). |
| 4 | **Enregistrement “escrow”** | En base : statut du placement = `funded` (fonds reçus). Montant travailleur, montant commission, référence paiement stockés. |
| 5 | **Période d’essai / travail** | Le travailleur fait le job. Pendant X jours (ex. 7 ou 14), le recruteur peut signaler un problème (litige) ou confirmer que tout va bien. |
| 6 | **Libération** | Quand le recruteur confirme “Placement OK” (ou après X jours sans litige), la plateforme déclenche un **transfert Mobile Money** vers le numéro du travailleur (montant convenu). La commission reste côté NUNDO. |
| 7 | **Retrait travailleur** | Le travailleur reçoit l’argent sur son Mobile Money (déjà disponible pour usage ou retrait selon l’opérateur). |

### Résumé

- **Comme Upwork** : le recruteur paie d’abord, les fonds sont “réservés” (en base + sur le compte marchand), puis libérés vers le travailleur après validation.
- **Avec Mobile Money** : la collecte et le transfert se font via Orange Money / MTN / Wave (ou agrégateur), pas via une carte bancaire.

---

## 4. Intégration adullam.dev (agrégateur retenu)

NUNDO utilise **adullam.dev** pour les paiements Mobile Money (Orange, MTN, Wave).

### Côté backend (déjà en place)

- **Service** : `server/services/adullam.js`  
  - `createCollectIntent({ amount, payerPhone, reference, description })` → crée une demande de paiement, retourne `paymentUrl` et `transactionId`.  
  - `disburseToWorker({ amount, recipientPhone, reference })` → envoie l’argent au travailleur.  
  - `verifyWebhookSignature(payload, signature)` → vérifie le callback (optionnel).

- **Variables d’environnement** (à renseigner avec les clés fournies par adullam.dev) :
  - `ADULLAM_API_URL` – URL de base de l’API (ex. `https://api.adullam.dev/v1`).
  - `ADULLAM_API_KEY` – Clé API.
  - `ADULLAM_WEBHOOK_SECRET` – Secret pour signer/vérifier les webhooks (recommandé).
  - `ADULLAM_CALLBACK_URL` – URL de callback (ex. `https://votredomaine.com/api/payments/webhook/adullam`).

- **Routes API** :
  - `POST /api/payments/intent` (auth) – Body : `{ applicationId [, workerPhone ] }`. Crée un escrow et retourne `paymentUrl` pour que le recruteur paie.
  - `POST /api/payments/webhook/adullam` (sans auth) – Callback adullam.dev : met l’escrow en `funded` quand le paiement est reçu.
  - `POST /api/payments/release/:escrowId` (auth, recruteur ou admin) – Déclenche le transfert vers le travailleur et met l’escrow en `released`.
  - `GET /api/payments/escrow/:applicationId` (auth) – Donne le statut du paiement pour une candidature.

- **Base de données** : table `escrow_payments` (id, application_id, recruiter_id, worker_id, amount_total, amount_worker, amount_commission, status, aggregator_ref, worker_phone, recruiter_phone, released_at, etc.).

### À faire avec adullam.dev

1. Obtenir les clés API et l’URL de base depuis adullam.dev.
2. Configurer dans `.env` : `ADULLAM_API_URL`, `ADULLAM_API_KEY`, et éventuellement `ADULLAM_WEBHOOK_SECRET` et `ADULLAM_CALLBACK_URL`.
3. Adapter dans `server/services/adullam.js` les noms des champs des requêtes/réponses si la doc adullam.dev diffère (ex. `payer_phone` vs `phone`, `payment_url` vs `paymentUrl`).
4. Configurer chez adullam.dev l’URL de webhook vers `https://votredomaine.com/api/payments/webhook/adullam`.

---

## 5. Données à prévoir en base (résumé)

- **Table des paiements / escrow**  
  - `id`, `placement_id` (ou `application_id`), `recruiter_id`, `worker_id`, `amount_total`, `amount_worker`, `amount_commission`, `currency`, `status` (`pending` | `funded` | `released` | `refunded` | `disputed`), `provider` (orange_money, mtn, wave), `external_payment_id`, `released_at`, `created_at`.

- **Lien avec les candidatures**  
  - Quand le recruteur accepte une candidature, on crée un “placement” (ou on marque l’application comme `accepted` + on crée une entrée paiement en `pending_payment`).  
  - Dès que le callback “paiement reçu” arrive → `status = funded`.  
  - Quand le recruteur confirme ou après X jours → transfert vers le travailleur + `status = released`.

---

## 6. En résumé

| Upwork | NUNDO + Mobile Money |
|--------|----------------------|
| Client paie par carte → fonds en escrow | Recruteur paie par Orange / MTN / Wave → fonds collectés sur compte NUNDO (ou agrégateur) |
| Freelancer livre, client approuve | Travailleur fait le job, recruteur confirme “placement OK” (ou délai auto) |
| Fonds libérés vers le freelancer | Transfert Mobile Money vers le numéro du travailleur |
| Commission Upwork | Commission NUNDO (ex. 10 % du placement) |

Oui, on peut faire un système **type Upwork** sur NUNDO avec **Mobile Money** : le cœur du fonctionnement (paiement d’abord, libération après validation) est le même ; seule la couche technique change (APIs Mobile Money au lieu de carte / wallet Upwork). Pour démarrer, le plus simple est souvent de passer par un **agrégateur** (CinetPay, Flutterwave, etc.) pour avoir Orange + MTN + Wave en une seule intégration.
