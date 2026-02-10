import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "nundo-dev-secret";

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({ message: "Authentification requise." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Token invalide ou expiré." });
  }
}

