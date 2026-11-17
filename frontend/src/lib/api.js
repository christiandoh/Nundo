/**
 * Base URL de l'API backend.
 * En Docker (nginx proxy) : VITE_API_URL="" → requêtes en relatif /api.
 * En dev local : défaut http://localhost:4000.
 */
const raw = import.meta.env.VITE_API_URL;
export const API_BASE =
  typeof raw === "string" && raw !== ""
    ? String(raw).replace(/\/$/, "")
    : raw === ""
      ? "" // same origin (nginx proxy)
      : "http://localhost:4000";
