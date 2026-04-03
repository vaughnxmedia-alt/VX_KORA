import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "../..");
  const appRoot = __dirname;
  /** Root `.env` first, then `apps/web/.env` overrides (same keys). */
  const merged = { ...loadEnv(mode, repoRoot, ""), ...loadEnv(mode, appRoot, "") };
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (key.startsWith("VITE_")) {
      define[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  return {
    define,
    server: {
      host: "127.0.0.1",
      port: 8095,
      strictPort: false,
      open: true,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
