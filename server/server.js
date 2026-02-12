import http from "http";
import app from "./app.js";
import { initSocket } from "./socket.js";
import { pool } from "./config/db.config.js";
import { ensureAdminMem } from "./routes/auth.routes.js";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialise Socket.io pour la messagerie temps réel
initSocket(server);

(async () => {
  if (!pool) await ensureAdminMem();
  server.listen(PORT, () => {
    console.log(`NUNDO backend listening on http://localhost:${PORT}`);
  });
})();


