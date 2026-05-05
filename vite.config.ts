import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendOrigin = (
    mode === "development"
      ? (env.VITE_BACKEND_ORIGIN_DEV || "http://localhost/agendate")
      : (env.VITE_BACKEND_ORIGIN || "https://agendate.app")
  ).replace(/\/$/, "");
  const devPort = Number(env.VITE_PORT || 8081);

  return {
    server: {
      host: "::",
      port: devPort,
      hmr: { overlay: false },
      proxy: {
        "/api": { target: backendOrigin, changeOrigin: true, secure: false },
        "/storage": { target: backendOrigin, changeOrigin: true, secure: false },
        "/uploads": { target: backendOrigin, changeOrigin: true, secure: false },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
  };
});
