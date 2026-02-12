/**
 * Restreint l'accès aux routes admin : seul le rôle "admin" est autorisé.
 * À placer après authMiddleware (req.user doit exister).
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Accès refusé." });
  }
  next();
}
