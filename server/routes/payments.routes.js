import { Router } from "express";

const router = Router();

router.post("/intent", (_req, res) => {
  res.json({ provider: "mobile-money", status: "mocked" });
});

export default router;

