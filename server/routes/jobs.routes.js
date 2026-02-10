import { Router } from "express";
import { pool } from "../config/db.config.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

const MAX_APPLICATIONS_PER_JOB = 10;

const jobsMem = [
  {
    id: 1,
    title: "Chauffeur privé",
    location: "Abobo",
    salary: "250000",
    contractType: "CDI",
    description: "Mission longue durée pour famille résidant à Abobo.",
    recruiterId: null,
    status: "open",
    applicationsCount: 0
  }
];
let nextIdMem = 2;

function rowToJob(row, applicationsCount) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    salary: row.salary,
    contractType: row.contract_type || "Non précisé",
    description: row.description || "",
    status: row.status || "open",
    applicationsCount: applicationsCount ?? (row.applications_count != null ? Number(row.applications_count) : 0)
  };
}

router.get("/", async (req, res, next) => {
  try {
    if (pool) {
      const result = await pool.query(
        `SELECT j.id, j.title, j.location, j.salary, j.contract_type, j.description, j.status,
                (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applications_count
         FROM jobs j
         WHERE j.status = 'open'
         ORDER BY j.id DESC`
      );
      return res.json(result.rows.map((row) => rowToJob(row, row.applications_count)));
    }
    const openJobs = jobsMem.filter((j) => j.status !== "closed");
    res.json(openJobs);
  } catch (err) {
    next(err);
  }
});

// Annonces du recruteur connecté (ouvertes + fermées)
router.get("/recruiter/me", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentification requise." });
    }
    if (pool) {
      const result = await pool.query(
        `SELECT j.id, j.title, j.location, j.salary, j.contract_type, j.description, j.status,
                (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applications_count
         FROM jobs j
         WHERE j.recruiter_id = $1
         ORDER BY j.id DESC`,
        [userId]
      );
      return res.json(result.rows.map((row) => rowToJob(row, row.applications_count)));
    }
    const myJobs = jobsMem.filter((j) => j.recruiterId === userId);
    res.json([...myJobs]);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (pool) {
      const result = await pool.query(
        `SELECT j.id, j.title, j.location, j.salary, j.contract_type, j.description, j.status,
                (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applications_count
         FROM jobs j WHERE j.id = $1`,
        [id]
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ message: "Mission introuvable." });
      }
      if (row.status === "closed") {
        return res.status(410).json({ message: "Cette annonce n'est plus disponible. Le recruteur a déjà accepté un candidat." });
      }
      return res.json(rowToJob(row, row.applications_count));
    }
    const job = jobsMem.find((j) => j.id === id);
    if (!job) {
      return res.status(404).json({ message: "Mission introuvable." });
    }
    if (job.status === "closed") {
      return res.status(410).json({ message: "Cette annonce n'est plus disponible. Le recruteur a déjà accepté un candidat." });
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
});

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { title, location, salary, contractType, description } = req.body || {};
    if (!title || !location || !salary) {
      return res
        .status(400)
        .json({ message: "Titre, lieu et salaire sont obligatoires." });
    }

    if (pool) {
      const recruiterId = req.user?.id ?? null;
      const result = await pool.query(
        `INSERT INTO jobs (title, location, salary, contract_type, description, recruiter_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'open')
         RETURNING id, title, location, salary, contract_type, description, status`,
        [title, location, salary, contractType || "Non précisé", description || "", recruiterId]
      );
      return res.status(201).json(rowToJob(result.rows[0], 0));
    }

    const job = {
      id: nextIdMem++,
      title,
      location,
      salary,
      contractType: contractType || "Non précisé",
      description: description || "",
      recruiterId: req.user?.id ?? null,
      status: "open",
      applicationsCount: 0
    };
    jobsMem.unshift(job);
    return res.status(201).json({ ...job, applicationsCount: 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
export { jobsMem };
