import http from "http";
import app from "./app.js";
import { initSocket } from "./socket.js";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialise Socket.io pour la messagerie temps réel
initSocket(server);

server.listen(PORT, () => {
  console.log(`NUNDO backend listening on http://localhost:${PORT}`);
});


