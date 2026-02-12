import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.config.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "nundo-dev-secret";
const JWT_EXPIRES_IN = "7d";

function signToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function toUserRow(row) {
  if (!row) return null;
  const profile = typeof row.profile === "object" ? row.profile : (row.profile && JSON.parse(row.profile)) || {};
  return {
    id: row.id,
    phone: row.phone,
    role: row.role,
    verified: true,
    profile
  };
}

// In-memory fallback when DATABASE_URL is not set
const usersMem = [];
let nextIdMem = 1;

const INIT_ADMIN_PHONE_MEM = process.env.INIT_ADMIN_PHONE || "0711118582";
const INIT_ADMIN_NAME_MEM = process.env.INIT_ADMIN_NAME || "doh lah";
const INIT_ADMIN_PASSWORD_MEM = process.env.INIT_ADMIN_PASSWORD || "Hacker@117";

export async function ensureAdminMem() {
  if (pool) return;
  if (usersMem.some((u) => u.phone === INIT_ADMIN_PHONE_MEM)) return;
  const passwordHash = await bcrypt.hash(INIT_ADMIN_PASSWORD_MEM, 10);
  usersMem.push({
    id: nextIdMem++,
    phone: INIT_ADMIN_PHONE_MEM,
    role: "admin",
    passwordHash,
    profile: { fullName: INIT_ADMIN_NAME_MEM },
    created_at: new Date().toISOString()
  });
  console.log("[NUNDO] Compte admin (mémoire) créé pour", INIT_ADMIN_PHONE_MEM);
}

export function getUsersForAdmin() {
  return usersMem.map((u) => ({
    id: u.id,
    phone: u.phone,
    role: u.role,
    profile: u.profile || {},
    created_at: u.created_at || null
  }));
}

router.post("/register", async (req, res, next) => {
  try {
    const {
      phone,
      password,
      role = "worker",
      fullName,
      mainSkill,
      experienceYears,
      city
    } = req.body || {};

    if (!phone || !password) {
      return res.status(400).json({ message: "Téléphone et mot de passe requis." });
    }

    if (role === "admin") {
      return res.status(403).json({ message: "Création de compte admin non autorisée." });
    }

    const profile =
      role === "worker"
        ? {
            fullName: fullName || "",
            mainSkill: mainSkill || "",
            experienceYears: experienceYears || "",
            city: city || ""
          }
        : {};

    if (pool) {
      const exists = await pool.query(
        "SELECT id FROM users WHERE phone = $1",
        [phone]
      );
      if (exists.rows.length > 0) {
        return res.status(409).json({ message: "Un compte existe déjà avec ce numéro." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const insert = await pool.query(
        `INSERT INTO users (phone, password_hash, role, profile)
         VALUES ($1, $2, $3, $4)
         RETURNING id, phone, role, profile`,
        [phone, passwordHash, role, JSON.stringify(profile)]
      );
      const row = insert.rows[0];
      const user = toUserRow(row);
      const token = signToken(user);
      return res.status(201).json({ token, user });
    }

    const exists = usersMem.find((u) => u.phone === phone);
    if (exists) {
      return res.status(409).json({ message: "Un compte existe déjà avec ce numéro." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: nextIdMem++,
      phone,
      role,
      passwordHash,
      profile,
      created_at: new Date().toISOString()
    };
    usersMem.push(user);
    const token = signToken({ id: user.id, phone: user.phone, role: user.role });
    return res.status(201).json({
      token,
      user: { id: user.id, phone: user.phone, role: user.role, verified: true, profile: user.profile }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ message: "Téléphone et mot de passe requis." });
    }

    if (pool) {
      const result = await pool.query(
        "SELECT id, phone, role, password_hash, profile FROM users WHERE phone = $1",
        [phone]
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(401).json({ message: "Identifiants incorrects." });
      }
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) {
        return res.status(401).json({ message: "Identifiants incorrects." });
      }
      const user = toUserRow(row);
      const token = signToken(user);
      return res.json({ token, user });
    }

    const user = usersMem.find((u) => u.phone === phone);
    if (!user) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }
    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, phone: user.phone, role: user.role, verified: true, profile: user.profile || {} }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/profile", async (req, res, next) => {
  try {
    const {
      id,
      fullName,
      mainSkill,
      experienceYears,
      city,
      avatarUrl,
      phone,
      profession,
      bio
    } = req.body || {};
    if (!id) {
      return res.status(400).json({ message: "id requis." });
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
      const current = typeof row.profile === "object" ? row.profile : JSON.parse(row.profile || "{}");
      let profile;
      if (row.role === "recruiter") {
        profile = {
          ...current,
          fullName: fullName ?? current.fullName,
          phone: phone ?? current.phone,
          avatarUrl: avatarUrl ?? current.avatarUrl,
          profession: profession ?? current.profession,
          bio: bio ?? current.bio
        };
      } else {
        profile = {
          ...current,
          fullName: fullName ?? current.fullName,
          mainSkill: mainSkill ?? current.mainSkill,
          experienceYears: experienceYears ?? current.experienceYears,
          city: city ?? current.city,
          avatarUrl: avatarUrl ?? current.avatarUrl
        };
      }
      await pool.query(
        "UPDATE users SET profile = $1 WHERE id = $2",
        [JSON.stringify(profile), id]
      );
      return res.json({
        id: row.id,
        phone: row.phone,
        role: row.role,
        verified: true,
        profile
      });
    }

    const user = usersMem.find((u) => u.id === Number(id));
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    if (user.role === "recruiter") {
      user.profile = {
        ...(user.profile || {}),
        fullName: fullName ?? user.profile?.fullName,
        phone: phone ?? user.profile?.phone,
        avatarUrl: avatarUrl ?? user.profile?.avatarUrl,
        profession: profession ?? user.profile?.profession,
        bio: bio ?? user.profile?.bio
      };
    } else {
      user.profile = {
        ...(user.profile || {}),
        fullName: fullName ?? user.profile?.fullName,
        mainSkill: mainSkill ?? user.profile?.mainSkill,
        experienceYears: experienceYears ?? user.profile?.experienceYears,
        city: city ?? user.profile?.city,
        avatarUrl: avatarUrl ?? user.profile?.avatarUrl
      };
    }
    return res.json({
      id: user.id,
      phone: user.phone,
      role: user.role,
      verified: true,
      profile: user.profile
    });
  } catch (err) {
    next(err);
  }
});

export default router;
