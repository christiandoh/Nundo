import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import jobsRoutes from "./routes/jobs.routes.js";
import applicationsRoutes from "./routes/applications.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import adminRoutes from "./routes/admin.routes.js";

import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { pool } from "./config/db.config.js";

dotenv.config();

const app = express();

app.use(cors());
// Limite à 10 Mo pour accepter les images en base64 (photos dans le chat)
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", async (_req, res, next) => {
  try {
    let db = "not-configured";
    if (pool) {
      await pool.query("SELECT 1");
      db = "ok";
    }
    res.json({ status: "ok", service: "nundo-backend", db });
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, usersRoutes);
// GET /api/jobs (public); POST protected inside jobs.routes
app.use("/api/jobs", jobsRoutes);
app.use("/api/applications", authMiddleware, applicationsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorMiddleware);

export default app;

