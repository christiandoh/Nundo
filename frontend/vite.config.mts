import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ports surchargeables par variable d'environnement (utile si 5173/4000 sont occupés).
const DEFAULT_DEV_PORT = 5173;
const devPort = Number(process.env.VITE_PORT) || DEFAULT_DEV_PORT;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: devPort
  }
});

