import { Router } from "express";
import { pool } from "../config/db.config.js";
import { getIO } from "../socket.js";
import { jobsMem } from "./jobs.routes.js";

const router = Router();
const MAX_APPLICATIONS_PER_JOB = 10;

const applicationsMem = [];
let nextAppIdMem = 1;

function rowToApp(row) {
  if (!row) return null;
  return {
    id: row.id,
    jobId: row.job_id,
    workerId: row.worker_id,
    message: row.message || "",
    workerName: row.worker_name || "",
    workerMainSkill: row.worker_main_skill || "",
    workerAvatarUrl: row.worker_avatar_url || null,
    status: row.status || "pending",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at).toISOString() : null
  };
}

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function rowToMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    from: row.from_role,
    text: row.text,
    type: row.type || "text",
    attachmentName: row.attachment_name || null,
    attachmentData: row.attachment_data || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
  };
}

// Après acceptation d'un candidat pour un poste, les autres postulants (pending) du même poste
// disparaissent de la liste du recruteur au bout de 10 min.
const HIDE_PENDING_AFTER_ACCEPT_MS = 10 * 60 * 1000;

router.get("/", async (req, res, next) => {
  try {
    if (pool) {
      const result = await pool.query(
        `SELECT a.id, a.job_id, a.worker_id, a.message, a.worker_name, a.worker_main_skill, a.worker_avatar_url, a.status, a.created_at, a.accepted_at
         FROM applications a
         WHERE a.status = 'accepted'
            OR NOT EXISTS (
              SELECT 1 FROM applications b
              WHERE b.job_id = a.job_id AND b.status = 'accepted'
                AND b.accepted_at IS NOT NULL
                AND b.accepted_at < NOW() - INTERVAL '10 minutes'
            )
         ORDER BY a.id DESC`
      );
      return res.json(result.rows.map(rowToApp));
    }
    const cutoff = new Date(Date.now() - HIDE_PENDING_AFTER_ACCEPT_MS).toISOString();
    const jobIdsWithOldAccept = new Set();
    applicationsMem.forEach((a) => {
      if (a.status === "accepted" && a.acceptedAt && a.acceptedAt <= cutoff) {
        jobIdsWithOldAccept.add(a.jobId);
      }
    });
    const filtered = applicationsMem.filter((a) => {
      if (a.status === "accepted") return true;
      if (a.status !== "pending") return true;
      return !jobIdsWithOldAccept.has(a.jobId);
    });
    res.json(filtered.map((a) => ({
      ...a,
      jobId: a.jobId,
      workerId: a.workerId,
      workerName: a.workerName,
      workerMainSkill: a.workerMainSkill,
      acceptedAt: a.acceptedAt ?? null
    })));
  } catch (err) {
    next(err);
  }
});

// Candidatures du travailleur connecté (à placer avant /:id)
router.get("/me", async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentification requise." });
    }
    if (pool) {
      const result = await pool.query(
        `SELECT a.id, a.job_id, a.worker_id, a.message, a.worker_name, a.worker_main_skill, a.worker_avatar_url, a.status, a.created_at, j.title AS job_title
         FROM applications a
         LEFT JOIN jobs j ON j.id = a.job_id
         WHERE a.worker_id = $1
         ORDER BY a.id DESC`,
        [userId]
      );
      const list = result.rows.map((row) => ({
        ...rowToApp(row),
        jobTitle: row.job_title || ""
      }));
      return res.json(list);
    }
    const list = applicationsMem
      .filter((a) => a.workerId === userId)
      .map((a) => ({ ...a, jobId: a.jobId, workerId: a.workerId, jobTitle: "" }));
    return res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (pool) {
      const result = await pool.query(
        `SELECT a.id,
                a.job_id,
                a.worker_id,
                a.message,
                a.worker_name,
                a.worker_main_skill,
                a.worker_avatar_url,
                a.status,
                a.created_at,
                j.recruiter_id,
                u.profile AS recruiter_profile
         FROM applications a
         LEFT JOIN jobs j ON j.id = a.job_id
         LEFT JOIN users u ON u.id = j.recruiter_id
         WHERE a.id = $1`,
        [id]
      );
      const row = result.rows[0];
      const app = rowToApp(row);
      if (!app) {
        return res.status(404).json({ message: "Candidature introuvable." });
      }
      let recruiterProfile = {};
      if (row?.recruiter_profile) {
        recruiterProfile =
          typeof row.recruiter_profile === "object"
            ? row.recruiter_profile
            : JSON.parse(row.recruiter_profile || "{}");
      }
      return res.json({
        ...app,
        recruiterId: row?.recruiter_id || null,
        recruiterName: recruiterProfile.fullName || null,
        recruiterAvatarUrl: recruiterProfile.avatarUrl || null
      });
    }
    const app = applicationsMem.find((a) => a.id === id);
    if (!app) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }
    const job = jobsMem.find((j) => j.id === app.jobId);
    const recruiterId = job?.recruiterId ?? null;
    res.json({
      ...app,
      jobId: app.jobId,
      workerId: app.workerId,
      recruiterId,
      recruiterName: null,
      recruiterAvatarUrl: null
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { jobId, workerId, message, workerName, workerMainSkill, workerAvatarUrl } = req.body || {};
    if (!jobId || !workerId) {
      return res.status(400).json({ message: "jobId et workerId sont requis." });
    }

    if (pool) {
      const countResult = await pool.query(
        "SELECT COUNT(*)::int AS cnt FROM applications WHERE job_id = $1",
        [jobId]
      );
      const count = countResult.rows[0]?.cnt ?? 0;
      if (count >= MAX_APPLICATIONS_PER_JOB) {
        return res.status(403).json({
          message: "Nombre de postulants atteint pour ce poste. Merci pour votre compréhension. Maximum 10."
        });
      }
      const existing = await pool.query(
        "SELECT id FROM applications WHERE job_id = $1 AND worker_id = $2",
        [jobId, workerId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          message: "Tu as déjà postulé à cette mission. Une seule candidature par offre."
        });
      }
      const result = await pool.query(
        `INSERT INTO applications (job_id, worker_id, message, worker_name, worker_main_skill, worker_avatar_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id, job_id, worker_id, message, worker_name, worker_main_skill, worker_avatar_url, status, created_at`,
        [jobId, workerId, message || "", workerName || "", workerMainSkill || "", workerAvatarUrl || null]
      );
      const app = rowToApp(result.rows[0]);
      try {
        getIO().to("recruiters").emit("new_application", app);
      } catch (_e) {}
      return res.status(201).json(app);
    }

    const applicationsForJob = applicationsMem.filter((a) => Number(a.jobId) === Number(jobId));
    if (applicationsForJob.length >= MAX_APPLICATIONS_PER_JOB) {
      return res.status(403).json({
        message: "Nombre de postulants atteint pour ce poste. Merci pour votre compréhension. Maximum 10."
      });
    }
    const alreadyApplied = applicationsForJob.some((a) => Number(a.workerId) === Number(workerId));
    if (alreadyApplied) {
      return res.status(409).json({
        message: "Tu as déjà postulé à cette mission. Une seule candidature par offre."
      });
    }
    const application = {
      id: nextAppIdMem++,
      jobId,
      workerId,
      message: message || "",
      workerName: workerName || "",
      workerMainSkill: workerMainSkill || "",
      workerAvatarUrl: workerAvatarUrl || null,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    applicationsMem.push(application);
    const jobMem = jobsMem.find((j) => j.id === application.jobId);
    if (jobMem) jobMem.applicationsCount = (jobMem.applicationsCount || 0) + 1;
    try {
      getIO().to("recruiters").emit("new_application", {
        ...application,
        jobId: application.jobId,
        workerId: application.workerId
      });
    } catch (_e) {}
    return res.status(201).json({
      ...application,
      jobId: application.jobId,
      workerId: application.workerId
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/accept", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    let app = null;
    if (pool) {
      const result = await pool.query(
        `UPDATE applications SET status = 'accepted', accepted_at = NOW() WHERE id = $1
         RETURNING id, job_id, worker_id, message, worker_name, worker_main_skill, status, created_at, accepted_at`,
        [id]
      );
      app = result.rows[0] ? rowToApp(result.rows[0]) : null;
      if (app) {
        await pool.query("UPDATE jobs SET status = 'closed' WHERE id = $1", [app.jobId]);
      }
      if (!app) {
        return res.status(404).json({ message: "Candidature introuvable." });
      }
    } else {
      const a = applicationsMem.find((x) => x.id === id);
      if (!a) {
        return res.status(404).json({ message: "Candidature introuvable." });
      }
      a.status = "accepted";
      a.acceptedAt = new Date().toISOString();
      const jobMem = jobsMem.find((j) => j.id === a.jobId);
      if (jobMem) jobMem.status = "closed";
      app = { ...a, jobId: a.jobId, workerId: a.workerId, acceptedAt: a.acceptedAt };
    }
    // Notification temps réel au travailleur
    try {
      const io = getIO();
      io.to(`user:${app.workerId}`).emit("application_accepted", {
        applicationId: id,
        application: app
      });
      io.to(`application:${id}`).emit("application_accepted", {
        applicationId: id,
        application: app
      });
    } catch (_e) {
      // Socket non dispo en mémoire, ignorer
    }
    return res.json(app);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/messages", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (pool) {
      const result = await pool.query(
        `SELECT id, application_id, from_role, text, type, attachment_name, attachment_data, created_at, updated_at, deleted_at
         FROM messages WHERE application_id = $1 ORDER BY id ASC`,
        [id]
      );
      return res.json(result.rows.map(rowToMessage));
    }
    const app = applicationsMem.find((a) => a.id === id);
    if (!app) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }
    const messages = app.messages || [];
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/messages", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { from, text, type = "text", attachmentName, attachmentData } = req.body || {};
    if (!from || !text) {
      return res.status(400).json({ message: "from et text sont requis." });
    }

    if (pool) {
      const result = await pool.query(
        `INSERT INTO messages (application_id, from_role, text, type, attachment_name, attachment_data)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, application_id, from_role, text, type, attachment_name, attachment_data, created_at, updated_at, deleted_at`,
        [id, from, text, type, attachmentName || null, attachmentData || null]
      );
      const message = rowToMessage(result.rows[0]);
      try {
        getIO().to(`application:${id}`).emit("new_message", message);
      } catch (_e) {}
      return res.status(201).json(message);
    }

    const app = applicationsMem.find((a) => a.id === id);
    if (!app) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }
    if (!app.messages) app.messages = [];
    const message = {
      id: app.messages.length + 1,
      from,
      text,
      type,
      attachmentName: attachmentName || null,
      attachmentData: attachmentData || null,
      createdAt: new Date().toISOString()
    };
    app.messages.push(message);
    try {
      getIO().to(`application:${id}`).emit("new_message", message);
    } catch (_e) {}
    return res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/messages/:messageId", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const messageId = Number(req.params.messageId);
    if (pool) {
      const result = await pool.query(
        `UPDATE messages SET deleted_at = NOW() WHERE application_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING id, application_id, from_role, text, type, attachment_name, attachment_data, created_at, updated_at, deleted_at`,
        [id, messageId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Message introuvable." });
      }
      const message = rowToMessage(result.rows[0]);
      try {
        getIO().to(`application:${id}`).emit("message_deleted", { applicationId: id, messageId, message });
      } catch (_e) {}
      return res.status(200).json(message);
    }
    const app = applicationsMem.find((a) => a.id === id);
    if (!app) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }
    const msg = app.messages?.find((m) => m.id === messageId);
    if (!msg) {
      return res.status(404).json({ message: "Message introuvable." });
    }
    const deletedAt = new Date().toISOString();
    msg.deletedAt = deletedAt;
    const message = {
      id: msg.id,
      from: msg.from,
      text: msg.text,
      type: msg.type || "text",
      attachmentName: msg.attachmentName ?? null,
      attachmentData: msg.attachmentData ?? null,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt ?? null,
      deletedAt
    };
    try {
      getIO().to(`application:${id}`).emit("message_deleted", { applicationId: id, messageId, message });
    } catch (_e) {}
    return res.status(200).json(message);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/messages/:messageId", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const messageId = Number(req.params.messageId);
    const { text, attachmentData } = req.body || {};
    if (pool) {
      const existing = await pool.query(
        "SELECT id, created_at, updated_at, deleted_at FROM messages WHERE application_id = $1 AND id = $2",
        [id, messageId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ message: "Message introuvable." });
      }
      const row = existing.rows[0];
      if (row.deleted_at) {
        return res.status(404).json({ message: "Message introuvable." });
      }
      const createdAt = new Date(row.created_at).getTime();
      const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : null;
      const refTime = updatedAt ?? createdAt;
      if (Date.now() - refTime > EDIT_WINDOW_MS) {
        return res.status(403).json({ message: "Le délai de modification est dépassé (15 minutes)." });
      }
      const updates = ["updated_at = NOW()"];
      const values = [];
      let v = 1;
      if (text !== undefined) {
        updates.push(`text = $${v++}`);
        values.push(text);
      }
      if (attachmentData !== undefined) {
        updates.push(`attachment_data = $${v++}`);
        values.push(attachmentData);
      }
      values.push(id, messageId);
      const result = await pool.query(
        `UPDATE messages SET ${updates.join(", ")} WHERE application_id = $${v++} AND id = $${v}
         RETURNING id, application_id, from_role, text, type, attachment_name, attachment_data, created_at, updated_at, deleted_at`,
        values
      );
      const message = rowToMessage(result.rows[0]);
      try {
        getIO().to(`application:${id}`).emit("message_updated", { applicationId: id, message });
      } catch (_e) {}
      return res.json(message);
    }
    const app = applicationsMem.find((a) => a.id === id);
    if (!app) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }
    const msg = app.messages?.find((m) => m.id === messageId);
    if (!msg) {
      return res.status(404).json({ message: "Message introuvable." });
    }
    if (msg.deletedAt) {
      return res.status(404).json({ message: "Message introuvable." });
    }
    const refTime = new Date(msg.updatedAt || msg.createdAt).getTime();
    if (Date.now() - refTime > EDIT_WINDOW_MS) {
      return res.status(403).json({ message: "Le délai de modification est dépassé (15 minutes)." });
    }
    if (text !== undefined) msg.text = text;
    if (attachmentData !== undefined) msg.attachmentData = attachmentData;
    msg.updatedAt = new Date().toISOString();
    const message = {
      id: msg.id,
      from: msg.from,
      text: msg.text,
      type: msg.type || "text",
      attachmentName: msg.attachmentName ?? null,
      attachmentData: msg.attachmentData ?? null,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      deletedAt: msg.deletedAt ?? null
    };
    try {
      getIO().to(`application:${id}`).emit("message_updated", { applicationId: id, message });
    } catch (_e) {}
    return res.json(message);
  } catch (err) {
    next(err);
  }
});

export default router;
