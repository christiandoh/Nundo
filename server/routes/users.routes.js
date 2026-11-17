import { Router } from "express";
import { pool } from "../config/db.config.js";
import { getWorkersMem } from "./auth.routes.js";

const router = Router();

// Liste de tous les travailleurs inscrits (recruteurs et admin uniquement)
router.get("/workers", async (req, res, next) => {
  try {
    const { role } = req.user || {};
    if (role !== "recruiter" && role !== "admin") {
      return res.status(403).json({ message: "Réservé aux recruteurs." });
    }
    if (pool) {
      const result = await pool.query(
        `SELECT id, profile, created_at
         FROM users
         WHERE role = 'worker'
         ORDER BY created_at DESC NULLS LAST`
      );
      const workers = result.rows.map((row) => {
        const profile = typeof row.profile === "object"
          ? row.profile
          : (row.profile && JSON.parse(row.profile)) || {};
        return {
          id: row.id,
          fullName: profile.fullName ?? "",
          mainSkill: profile.mainSkill ?? "",
          experienceYears: profile.experienceYears ?? "",
          city: profile.city ?? "",
          avatarUrl: profile.avatarUrl ?? null,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
        };
      });
      return res.json(workers);
    }
    return res.json(getWorkersMem());
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { id } = req.user || {};
    if (!id) {
      return res.status(401).json({ message: "Authentification requise." });
    }
    if (pool) {
      const result = await pool.query(
        "SELECT id, phone, role, profile FROM users WHERE id = $1",
        [id]
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }
      const profile = typeof row.profile === "object" ? row.profile : (row.profile && JSON.parse(row.profile)) || {};
      return res.json({
        id: row.id,
        phone: row.phone,
        role: row.role,
        profile
      });
    }
    res.json([{ id: 1, type: "worker" }]);
  } catch (err) {
    next(err);
  }
});

// Profil public d’un utilisateur (nom, compétence, avatar) — pour afficher la photo du travailleur dans le chat
router.get("/:id/profile", async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!targetId) {
      return res.status(400).json({ message: "id invalide." });
    }
    if (pool) {
      const result = await pool.query(
        "SELECT id, role, profile FROM users WHERE id = $1",
        [targetId]
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }
      const profile = typeof row.profile === "object" ? row.profile : (row.profile && JSON.parse(row.profile)) || {};
      return res.json({
        id: row.id,
        fullName: profile.fullName ?? "",
        mainSkill: profile.mainSkill ?? "",
        avatarUrl: profile.avatarUrl ?? null,
        city: profile.city ?? ""
      });
    }
    return res.status(404).json({ message: "Utilisateur introuvable." });
  } catch (err) {
    next(err);
  }
});

export default router;
