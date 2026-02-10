import { Server } from "socket.io";

let ioInstance = null;

export function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  ioInstance.on("connection", (socket) => {
    // Le travailleur/recruteur rejoint sa room pour recevoir les notifications (ex: candidature acceptée)
    socket.on("join_user", ({ userId }) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });

    // Les recruteurs rejoignent cette room pour recevoir les nouvelles candidatures en temps réel
    socket.on("join_recruiters", () => {
      socket.join("recruiters");
    });

    // Rejoint une "room" dédiée à une candidature donnée (chat)
    socket.on("join_application", ({ applicationId }) => {
      if (!applicationId) return;
      socket.join(`application:${applicationId}`);
    });

    // Lorsqu'un client signale qu'un message a été créé côté backend,
    // on le propage à tous les clients connectés sur cette candidature.
    socket.on("message_created", ({ applicationId, message }) => {
      if (!applicationId || !message) return;
      ioInstance.to(`application:${applicationId}`).emit("new_message", message);
    });
  });

  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.io n'est pas initialisé");
  }
  return ioInstance;
}

