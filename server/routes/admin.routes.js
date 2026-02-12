import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import { pool } from "../config/db.config.js";
import { getUsersForAdmin } from "./auth.routes.js";

const router = Router();

router.use(authMiddleware);
router.use(requireAdmin);

function maskPhone(phone) {
  if (!phone || typeof phone !== "string") return "—";
  const s = phone.replace(/\D/g, "").slice(-4);
  return "***" + s;
}

router.get("/users", async (req, res, next) => {
  try {
    let list = [];

    if (pool) {
      const result = await pool.query(
        "SELECT id, phone, role, profile, created_at FROM users ORDER BY created_at DESC"
      );
      list = result.rows.map((row) => {
        const profile = typeof row.profile === "object"
          ? row.profile
          : (row.profile && JSON.parse(row.profile)) || {};
        return {
          id: row.id,
          phone: maskPhone(row.phone),
          role: row.role,
          fullName: profile.fullName ?? "",
          created_at: row.created_at ? new Date(row.created_at).toISOString() : null
        };
      });
    } else {
      list = getUsersForAdmin().map((u) => ({
        id: u.id,
        phone: maskPhone(u.phone),
        role: u.role,
        fullName: (u.profile && u.profile.fullName) ?? "",
        created_at: u.created_at || null
      }));
    }

    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    let byRole = { worker: 0, recruiter: 0, admin: 0 };
    let byDay = [];

    if (pool) {
      const roleResult = await pool.query(
        "SELECT role, COUNT(*) AS count FROM users GROUP BY role"
      );
      roleResult.rows.forEach((r) => {
        byRole[r.role] = Number(r.count);
      });

      const dayResult = await pool.query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS count
         FROM users
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`
      );
      byDay = dayResult.rows.map((r) => ({
        date: r.date,
        count: Number(r.count)
      }));
    } else {
      const list = getUsersForAdmin();
      list.forEach((u) => {
        byRole[u.role] = (byRole[u.role] || 0) + 1;
      });

      const now = new Date();
      const dayMap = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = 0;
      }
      list.forEach((u) => {
        if (u.created_at) {
          const key = u.created_at.slice(0, 10);
          if (dayMap[key] !== undefined) dayMap[key]++;
        }
      });
      byDay = Object.entries(dayMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));
    }

    res.json({ byRole, byDay });
  } catch (err) {
    next(err);
  }
});

export default router;
