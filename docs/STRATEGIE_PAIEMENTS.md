# Stratégie paiements NUNDO – Éviter l’usage sans payer

En tant que gestionnaire, voici une proposition claire pour monétiser la plateforme et éviter que les utilisateurs profitent du service sans payer.

---

## 1. Qui paie quoi ?

| Acteur        | Ce qu’il paie                          | Moment idéal                    |
|---------------|----------------------------------------|----------------------------------|
| **Recruteur** | Accès aux candidatures / placement    | Avant de voir les postulants ou à la validation |
| **Travailleur** | Optionnel : boost profil, badge vérifié | Abonnement ou one-shot          |

Recommandation : **faire payer le recruteur**, qui a la demande (il cherche un talent). Le travailleur reste gratuit pour maximiser l’inscription et le volume de candidatures.

---

## 2. Modèles possibles

### Option A – Paiement à l’annonce (par offre)
- Le recruteur **paie avant de publier** une mission (ou avant qu’elle soit visible).
- Un prix fixe par annonce (ex. 2 000–5 000 FCFA) ou par mois pour X annonces.
- **Avantage** : revenu dès la publication. **Inconvénient** : peut freiner les petits recruteurs.

### Option B – Paiement au placement (commission)
- Le recruteur **paie quand il valide/accepte** un travailleur pour un poste.
- Montant fixe par placement (ex. 5 000–10 000 FCFA) ou % du premier salaire.
- **Avantage** : aligné sur la valeur (placement réussi). **Inconvénient** : encaissement plus tard.

### Option C – Abonnement recruteur
- Forfait mensuel (ex. 10 000 FCFA/mois) : annonces illimitées ou avec quota + accès aux candidatures.
- **Avantage** : revenus récurrents. **Inconvénient** : barrière à l’entrée plus haute.

### Recommandation courte
- **Court terme** : **Option B (paiement au placement)** + éventuellement **Option A (petit forfait par annonce)** pour les recruteurs qui veulent juste tester.
- **Moyen terme** : ajouter un **abonnement** (Option C) pour les recruteurs actifs.

---

## 3. Garde-fous techniques pour “sans payer = pas d’usage”

### 3.1 Bloquer l’action tant que le paiement n’est pas fait

- **Publication d’annonce**  
  - Vérifier un statut du type `recruiter.can_publish` (lié à un abonnement ou un solde).  
  - Si non éligible : refuser la création de job côté API et afficher un message + CTA paiement.

- **Voir les candidatures / contacter les postulants**  
  - Ne renvoyer la liste des candidatures (ou les coordonnées) que si :
    - le recruteur a un abonnement actif, ou  
    - il a payé pour cette annonce (ou pour ce placement).  
  - Sinon : message “Paiement requis pour voir les postulants” + lien vers paiement.

- **Accepter / valider un travailleur (placement)**  
  - Côté backend : avant de passer une candidature en `accepted`, vérifier qu’un paiement (ou un quota) est enregistré pour ce recruteur / cette annonce.  
  - Si pas de paiement : retourner `403` avec un message du type “Paiement requis pour confirmer ce placement”.

### 3.2 Données à tenir en base

- **Table `payments`** (ou `transactions`)  
  - `id`, `recruiter_id`, `amount`, `currency` (FCFA), `type` (`placement` | `subscription` | `boost`), `reference` (job_id ou subscription_id), `status` (`pending` | `completed` | `failed`), `provider` (orange_money, mtn, wave), `external_id`, `created_at`.

- **Table `subscriptions`** (si abonnement)  
  - `recruiter_id`, `plan_id`, `starts_at`, `ends_at`, `status` (`active` | `expired` | `cancelled`).

- **Champs sur `recruiters` ou `users`**  
  - Par exemple `subscription_ends_at`, ou un compteur `placements_paid` / `credits` pour les paiements au placement.

### 3.3 Règles métier à coder

1. **Publication d’annonce**  
   - `POST /api/jobs` : si modèle “payant par annonce”, vérifier un crédit ou un abonnement actif ; sinon refuser.

2. **Liste des candidatures**  
   - `GET /api/applications` (côté recruteur) : si “payant pour voir”, ne retourner la liste détaillée que si paiement/abonnement valide.

3. **Acceptation d’un candidat**  
   - `POST /api/applications/:id/accept` : vérifier qu’un paiement (ou un crédit) existe pour ce placement ; sinon `403` + message.

4. **Mobile Money (Côte d’Ivoire)**  
   - Intégrer au moins un provider : **Orange Money**, **MTN Mobile Money** ou **Wave** (API officielles ou passerelle type CinetPay, PayGate, etc.).  
   - Après callback “paiement réussi”, enregistrer la transaction et débloquer l’action (annonce, vue candidatures ou placement).

---

## 4. Parcours utilisateur recommandé (recruteur)

1. Inscription / connexion recruteur.
2. Création d’une annonce → **si modèle “payant à l’annonce”** : redirection vers paiement (Montant X FCFA) ; une fois payé, annonce publiée.
3. Réception de candidatures → **si “payant pour voir”** : message “Payer Y FCFA pour débloquer les candidatures” ; après paiement, liste + contacts visibles.
4. Choix d’un candidat → clic “Accepter” → **si “payant au placement”** : “Payer Z FCFA pour confirmer ce placement” ; après paiement, candidature passée en “acceptée” et placement enregistré.

Tu peux ne mettre qu’**une** de ces barrières au début (par ex. uniquement “paiement au placement”) pour simplifier.

---

## 5. Résumé des actions techniques

| Priorité | Action |
|----------|--------|
| 1 | Décider du modèle (annonce vs placement vs abonnement). |
| 2 | Ajouter table(s) `payments` (et évent. `subscriptions`) + champs nécessaires sur les users/recruiters. |
| 3 | Dans les routes (jobs, applications), vérifier “éligible au paiement” avant de créer une annonce, de renvoyer les candidatures ou d’accepter un candidat. |
| 4 | Intégrer un flux Mobile Money (Orange / MTN / Wave ou passerelle) et, au callback succès, enregistrer le paiement et débloquer l’action. |
| 5 | Côté front : afficher les CTA “Payer pour continuer” et les écrans de paiement (montant, choix du moyen). |

En appliquant ces garde-fous, les utilisateurs ne pourront pas publier (ou voir les candidatures, ou valider un placement) sans que le paiement soit enregistré côté backend.

Si tu veux, on peut détailler la structure exacte des tables et des routes (ex. champs `payments`, vérifications dans `jobs.routes.js` et `applications.routes.js`) en fonction du modèle que tu choisis (annonce, placement ou abonnement).
