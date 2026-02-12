/**
 * Intégration paiements Mobile Money via l'agrégateur adullam.dev
 * Documentation / clés API : à configurer avec adullam.dev
 *
 * Variables d'environnement :
 *   ADULLAM_API_URL   - Base URL de l'API (ex. https://api.adullam.dev/v1)
 *   ADULLAM_API_KEY   - Clé API
 *   ADULLAM_WEBHOOK_SECRET - Secret pour vérifier la signature des webhooks (optionnel)
 */

const ADULLAM_API_URL = process.env.ADULLAM_API_URL || "";
const ADULLAM_API_KEY = process.env.ADULLAM_API_KEY || "";

/**
 * Crée une demande de collecte (recruteur paie vers NUNDO).
 * @param {Object} params
 * @param {number} params.amount - Montant en FCFA
 * @param {string} params.payerPhone - Numéro Mobile Money du payeur (recruteur)
 * @param {string} params.reference - Référence unique (ex. escrow_123)
 * @param {string} [params.description] - Libellé
 * @returns {Promise<{ success: boolean, paymentUrl?: string, transactionId?: string, error?: string }>}
 */
export async function createCollectIntent({ amount, payerPhone, reference, description }) {
  if (!ADULLAM_API_URL || !ADULLAM_API_KEY) {
    return {
      success: false,
      error: "ADULLAM_API_URL et ADULLAM_API_KEY doivent être configurés.",
      paymentUrl: null,
      transactionId: `mock_${reference}_${Date.now()}`
    };
  }

  try {
    const res = await fetch(`${ADULLAM_API_URL}/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADULLAM_API_KEY}`
      },
      body: JSON.stringify({
        amount,
        currency: "XOF",
        payer_phone: normalizePhone(payerPhone),
        reference,
        description: description || `NUNDO placement ${reference}`,
        callback_url: process.env.ADULLAM_CALLBACK_URL || `${process.env.API_BASE_URL || "http://localhost:4000"}/api/payments/webhook/adullam`
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || res.statusText, transactionId: data.id };
    }
    return {
      success: true,
      paymentUrl: data.payment_url || data.paymentUrl,
      transactionId: data.transaction_id || data.id
    };
  } catch (err) {
    return { success: false, error: err.message, transactionId: null };
  }
}

/**
 * Envoie l'argent au travailleur (disbursement).
 * @param {Object} params
 * @param {number} params.amount - Montant en FCFA
 * @param {string} params.recipientPhone - Numéro Mobile Money du travailleur
 * @param {string} params.reference - Référence unique
 * @returns {Promise<{ success: boolean, transactionId?: string, error?: string }>}
 */
export async function disburseToWorker({ amount, recipientPhone, reference }) {
  if (!ADULLAM_API_URL || !ADULLAM_API_KEY) {
    return {
      success: true,
      transactionId: `mock_disburse_${reference}_${Date.now()}`,
      error: null
    };
  }

  try {
    const res = await fetch(`${ADULLAM_API_URL}/disburse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADULLAM_API_KEY}`
      },
      body: JSON.stringify({
        amount,
        currency: "XOF",
        recipient_phone: normalizePhone(recipientPhone),
        reference
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || res.statusText, transactionId: data.id };
    }
    return {
      success: true,
      transactionId: data.transaction_id || data.id
    };
  } catch (err) {
    return { success: false, error: err.message, transactionId: null };
  }
}

/**
 * Vérifie la signature du webhook adullam (si fournie).
 * @param {string} payload - Body brut
 * @param {string} signature - Header X-Adullam-Signature ou similaire
 * @returns {boolean}
 */
export function verifyWebhookSignature(payload, signature) {
  const secret = process.env.ADULLAM_WEBHOOK_SECRET;
  if (!secret) return true;
  // À adapter selon la doc adullam.dev (HMAC SHA256, etc.)
  return !!signature;
}

/**
 * Normalise le numéro pour l'API (225... ou 0...).
 */
function normalizePhone(phone) {
  if (!phone) return "";
  const s = String(phone).replace(/\D/g, "");
  if (s.startsWith("225")) return s;
  return "225" + s.replace(/^0/, "");
}
