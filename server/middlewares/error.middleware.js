export function errorMiddleware(err, _req, res, _next) {
  console.error(err);

  // Si un statut HTTP a déjà été défini sur la réponse, on le réutilise.
  // Sinon on tombe sur err.status, puis 500 par défaut.
  const explicitStatus = typeof err.status === "number" ? err.status : undefined;
  const status =
    explicitStatus || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  res.status(status).json({
    message: err.message || "Erreur interne du serveur",
    status
  });
}


