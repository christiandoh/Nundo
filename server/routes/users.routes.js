import { Router } from "express";
import { pool } from "../config/db.config.js";

const router = Router();

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
