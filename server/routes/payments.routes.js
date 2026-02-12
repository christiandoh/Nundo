import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { pool } from "../config/db.config.js";
import { getIO } from "../socket.js";
import * as adullam from "../services/adullam.js";

const router = Router();

const COMMISSION_PERCENT = 10;

const escrowMem = [];
let nextEscrowIdMem = 1;

function rowToEscrow(row) {
  if (!row) return null;
  return {
    id: row.id,
    applicationId: row.application_id,
    recruiterId: row.recruiter_id,
    workerId: row.worker_id,
    amountTotal: row.amount_total,
    amountWorker: row.amount_worker,
    amountCommission: row.amount_commission,
    currency: row.currency || "XOF",
    status: row.status,
    aggregator: row.aggregator || "adullam",
    aggregatorRef: row.aggregator_ref,
    workerPhone: row.worker_phone,
    recruiterPhone: row.recruiter_phone,
    releasedAt: row.released_at ? new Date(row.released_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

/**
 * POST /api/payments/intent
 * Crée un paiement escrow (type Upwork) pour une candidature acceptée.
 * Body: { applicationId }
 * Retourne: { paymentUrl, escrowId, amountTotal, amountWorker, amountCommission }
 */
router.post("/intent", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { applicationId, workerPhone: bodyWorkerPhone } = req.body || {};
    console.log("[NUNDO] POST /payments/intent", { applicationId, userId });
    if (!applicationId) {
      return res.status(400).json({ message: "applicationId requis." });
    }

    const appId = Number(applicationId);
    const recruiterPhone = req.user?.phone || "";

    if (pool) {
      const appResult = await pool.query(
        `SELECT a.id, a.job_id, a.worker_id, a.status, j.recruiter_id, j.salary, j.title
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1`,
        [appId]
      );
      const row = appResult.rows[0];
      if (!row) {
        return res.status(404).json({ message: "Candidature introuvable." });
      }
      if (row.recruiter_id !== userId) {
        return res.status(403).json({ message: "Seul le recruteur peut initier le paiement." });
      }
      if (row.status !== "pending" && row.status !== "accepted") {
        return res.status(400).json({ message: "Candidature non éligible au paiement." });
      }

      const salaryNum = parseInt(String(row.salary).replace(/\D/g, ""), 10) || 0;
      const amountWorker = salaryNum;
      const amountCommission = Math.round((salaryNum * COMMISSION_PERCENT) / 100);
      const amountTotal = amountWorker + amountCommission;

      const usersResult = await pool.query(
        "SELECT id, phone FROM users WHERE id IN ($1, $2)",
        [row.recruiter_id, row.worker_id]
      );
      const users = usersResult.rows;
      const recruiterPhone = users.find((u) => u.id === row.recruiter_id)?.phone || "";
      const workerPhone = users.find((u) => u.id === row.worker_id)?.phone || "";

      const existing = await pool.query(
        "SELECT id, status FROM escrow_payments WHERE application_id = $1",
        [appId]
      );
      if (existing.rows.length > 0) {
        const esc = existing.rows[0];
        if (esc.status === "funded" || esc.status === "released") {
          return res.status(400).json({ message: "Ce placement a déjà été payé." });
        }
        const escrow = rowToEscrow(esc);
        const again = await adullam.createCollectIntent({
          amount: amountTotal,
          payerPhone: recruiterPhone,
          reference: `nundo_escrow_${esc.id}`,
          description: `NUNDO - ${row.title}`
        });
        return res.json({
          escrowId: esc.id,
          paymentUrl: again.paymentUrl,
          amountTotal,
          amountWorker,
          amountCommission,
          status: esc.status
        });
      }

      const insert = await pool.query(
        `INSERT INTO escrow_payments (application_id, recruiter_id, worker_id, amount_total, amount_worker, amount_commission, worker_phone, recruiter_phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment')
         RETURNING id, application_id, amount_total, amount_worker, amount_commission, status`,
        [appId, row.recruiter_id, row.worker_id, amountTotal, amountWorker, amountCommission, workerPhone, recruiterPhone]
      );
      const escrowRow = insert.rows[0];
      const ref = `nundo_escrow_${escrowRow.id}`;

      const result = await adullam.createCollectIntent({
        amount: amountTotal,
        payerPhone: recruiterPhone,
        reference: ref,
        description: `NUNDO - ${row.title}`
      });

      if (result.transactionId) {
        await pool.query(
          "UPDATE escrow_payments SET aggregator_ref = $1, updated_at = NOW() WHERE id = $2",
          [result.transactionId, escrowRow.id]
        );
      }

      console.log("[NUNDO] Escrow créé (DB)", escrowRow.id, "paymentUrl:", result.paymentUrl ? "oui" : "non (configurer ADULLAM_*)");
      return res.status(201).json({
        escrowId: escrowRow.id,
        paymentUrl: result.paymentUrl,
        amountTotal,
        amountWorker,
        amountCommission,
        status: "pending_payment",
        error: result.error || null
      });
    }

    const { applicationsMem: applicationsMemStore } = await import("./applications.routes.js");
    const { jobsMem } = await import("./jobs.routes.js");
    const app = applicationsMemStore.find((a) => a.id === appId);
    if (!app) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }
    const job = jobsMem.find((j) => j.id === app.jobId);
    if (!job || job.recruiterId !== userId) {
      return res.status(403).json({ message: "Seul le recruteur peut initier le paiement." });
    }
    if (app.status !== "pending" && app.status !== "accepted") {
      return res.status(400).json({ message: "Candidature non éligible au paiement." });
    }

    const salaryNum = parseInt(String(job.salary).replace(/\D/g, ""), 10) || 0;
    const amountWorker = salaryNum;
    const amountCommission = Math.round((salaryNum * COMMISSION_PERCENT) / 100);
    const amountTotal = amountWorker + amountCommission;

    const existingMem = escrowMem.find((e) => e.applicationId === appId);
    if (existingMem && (existingMem.status === "funded" || existingMem.status === "released")) {
      return res.status(400).json({ message: "Ce placement a déjà été payé." });
    }

    let escrowRow;
    if (existingMem) {
      escrowRow = existingMem;
    } else {
      escrowRow = {
        id: nextEscrowIdMem++,
        applicationId: appId,
        recruiterId: job.recruiterId,
        workerId: app.workerId,
        amountTotal,
        amountWorker,
        amountCommission,
        currency: "XOF",
        status: "pending_payment",
        aggregator: "adullam",
        aggregatorRef: null,
        workerPhone: bodyWorkerPhone || "",
        recruiterPhone,
        releasedAt: null,
        createdAt: new Date().toISOString()
      };
      escrowMem.push(escrowRow);
    }

    const result = await adullam.createCollectIntent({
      amount: amountTotal,
      payerPhone: escrowRow.recruiterPhone || "",
      reference: `nundo_escrow_${escrowRow.id}`,
      description: `NUNDO - ${job.title}`
    });
    escrowRow.aggregatorRef = result.transactionId;

    console.log("[NUNDO] Escrow créé (mémoire)", escrowRow.id, "paymentUrl:", result.paymentUrl ? "oui" : "non (configurer ADULLAM_*)");
    return res.status(201).json({
      escrowId: escrowRow.id,
      paymentUrl: result.paymentUrl,
      amountTotal,
      amountWorker,
      amountCommission,
      status: "pending_payment",
      error: result.error || null
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/webhook/adullam
 * Callback appelé par adullam.dev quand un paiement est effectué (sans auth).
 */
router.post("/webhook/adullam", async (req, res, next) => {
  try {
    const signature = req.headers["x-adullam-signature"] || req.headers["x-webhook-signature"] || "";
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    if (!adullam.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ message: "Signature invalide." });
    }

    const { reference, status, transaction_id } = req.body || {};
    const ref = reference || req.body?.reference;
    const txId = transaction_id || req.body?.transactionId;
    const ok = (status || req.body?.status || "").toLowerCase();
    const isSuccess = ok === "success" || ok === "completed" || ok === "paid";

    if (!ref || !ref.startsWith("nundo_escrow_")) {
      return res.status(400).json({ message: "Référence invalide." });
    }
    const escrowId = parseInt(ref.replace("nundo_escrow_", ""), 10);

    if (pool) {
      const result = await pool.query(
        "SELECT id, application_id, status FROM escrow_payments WHERE id = $1",
        [escrowId]
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ message: "Escrow introuvable." });
      }
      if (row.status !== "pending_payment") {
        return res.json({ received: true, message: "Déjà traité." });
      }
      if (isSuccess) {
        await pool.query(
          "UPDATE escrow_payments SET status = 'funded', aggregator_ref = COALESCE($1, aggregator_ref), updated_at = NOW() WHERE id = $2",
          [txId, escrowId]
        );
        const appId = row.application_id;
        const appUpdate = await pool.query(
          `UPDATE applications SET status = 'accepted', accepted_at = NOW() WHERE id = $1 RETURNING id, job_id, worker_id`,
          [appId]
        );
        if (appUpdate.rows[0]) {
          const { job_id: jobId, worker_id: workerId } = appUpdate.rows[0];
          await pool.query("UPDATE jobs SET status = 'closed' WHERE id = $1", [jobId]);
          try {
            const io = getIO();
            io.to(`user:${workerId}`).emit("application_accepted", { applicationId: appId });
            io.to(`application:${appId}`).emit("application_accepted", { applicationId: appId });
          } catch (_e) {}
        }
      }
    } else {
      const esc = escrowMem.find((e) => e.id === escrowId);
      if (!esc) return res.status(404).json({ message: "Escrow introuvable." });
      if (esc.status !== "pending_payment") return res.json({ received: true });
      if (isSuccess) {
        esc.status = "funded";
        esc.aggregatorRef = txId || esc.aggregatorRef;
        const { applicationsMem } = await import("./applications.routes.js");
        const { jobsMem } = await import("./jobs.routes.js");
        const app = applicationsMem.find((a) => a.id === esc.applicationId);
        if (app) {
          app.status = "accepted";
          app.acceptedAt = new Date().toISOString();
          const job = jobsMem.find((j) => j.id === app.jobId);
          if (job) job.status = "closed";
          try {
            const io = getIO();
            io.to(`user:${app.workerId}`).emit("application_accepted", { applicationId: esc.applicationId });
            io.to(`application:${esc.applicationId}`).emit("application_accepted", { applicationId: esc.applicationId });
          } catch (_e) {}
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/release/:escrowId
 * Libère les fonds vers le travailleur (après confirmation recruteur ou délai).
 */
router.post("/release/:escrowId", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const escrowId = Number(req.params.escrowId);

    if (pool) {
      const result = await pool.query(
        "SELECT * FROM escrow_payments WHERE id = $1",
        [escrowId]
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ message: "Escrow introuvable." });
      }
      if (row.recruiter_id !== userId && role !== "admin") {
        return res.status(403).json({ message: "Non autorisé." });
      }
      if (row.status !== "funded") {
        return res.status(400).json({ message: "Les fonds doivent d'abord être reçus (status funded)." });
      }

      const disburse = await adullam.disburseToWorker({
        amount: row.amount_worker,
        recipientPhone: row.worker_phone,
        reference: `nundo_release_${row.id}`
      });

      if (!disburse.success) {
        return res.status(502).json({ message: disburse.error || "Échec du transfert." });
      }

      await pool.query(
        "UPDATE escrow_payments SET status = 'released', released_at = NOW(), updated_at = NOW() WHERE id = $1",
        [escrowId]
      );

      return res.json({
        escrowId,
        status: "released",
        message: "Montant envoyé au travailleur par Mobile Money."
      });
    }

    const esc = escrowMem.find((e) => e.id === escrowId);
    if (!esc) return res.status(404).json({ message: "Escrow introuvable." });
    if (esc.recruiterId !== userId && role !== "admin") {
      return res.status(403).json({ message: "Non autorisé." });
    }
    if (esc.status !== "funded") {
      return res.status(400).json({ message: "Les fonds doivent d'abord être reçus." });
    }

    const disburse = await adullam.disburseToWorker({
      amount: esc.amountWorker,
      recipientPhone: esc.workerPhone,
      reference: `nundo_release_${esc.id}`
    });

    if (!disburse.success) {
      return res.status(502).json({ message: disburse.error || "Échec du transfert." });
    }

    esc.status = "released";
    esc.releasedAt = new Date().toISOString();

    return res.json({
      escrowId,
      status: "released",
      message: "Montant envoyé au travailleur par Mobile Money."
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payments/escrow/:applicationId
 * Statut du paiement escrow pour une candidature (recruteur ou travailleur).
 */
router.get("/escrow/:applicationId", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const appId = Number(req.params.applicationId);

    if (pool) {
      const result = await pool.query(
        `SELECT e.* FROM escrow_payments e
         JOIN applications a ON a.id = e.application_id
         JOIN jobs j ON j.id = a.job_id
         WHERE e.application_id = $1 AND (e.recruiter_id = $2 OR e.worker_id = $2)`,
        [appId, userId]
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ message: "Aucun paiement escrow pour cette candidature." });
      }
      return res.json(rowToEscrow(row));
    }

    const esc = escrowMem.find((e) => e.applicationId === appId && (e.recruiterId === userId || e.workerId === userId));
    if (!esc) return res.status(404).json({ message: "Aucun paiement escrow pour cette candidature." });
    return res.json({
      id: esc.id,
      applicationId: esc.applicationId,
      recruiterId: esc.recruiterId,
      workerId: esc.workerId,
      amountTotal: esc.amountTotal,
      amountWorker: esc.amountWorker,
      amountCommission: esc.amountCommission,
      currency: esc.currency,
      status: esc.status,
      aggregator: esc.aggregator,
      aggregatorRef: esc.aggregatorRef,
      workerPhone: esc.workerPhone,
      recruiterPhone: esc.recruiterPhone,
      releasedAt: esc.releasedAt,
      createdAt: esc.createdAt
    });
  } catch (err) {
    next(err);
  }
});

export default router;
