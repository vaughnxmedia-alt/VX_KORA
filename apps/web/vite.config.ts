import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { devAnalyticsApi } from "./scripts/dev-analytics-api";

function vendorChunkName(id: string) {
  if (!id.includes("node_modules")) return undefined;

  const [, modulePath = ""] = id.split("node_modules/");
  const parts = modulePath.split("/");
  const packageName = parts[0]?.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];

  if (!packageName) return "vendor";
  if (
    packageName === "detect-node-es" ||
    packageName === "micromark-util-encode" ||
    packageName === "micromark-extension-gfm-tagfilter"
  ) {
    return undefined;
  }
  if (packageName === "react" || packageName === "react-dom" || packageName === "scheduler") return "vendor-react";
  if (packageName.startsWith("@radix-ui")) return "vendor-radix";
  if (packageName.startsWith("@supabase")) return "vendor-supabase";
  if (packageName.startsWith("@tanstack")) return "vendor-tanstack";
  if (packageName === "@uiw/react-md-editor") return "vendor-md-editor";
  if (packageName === "@uiw/react-markdown-preview") return "vendor-md-preview";
  if (packageName.startsWith("@uiw")) return `vendor-${packageName.replace("@", "").replace("/", "-")}`;
  if (packageName === "jspdf") return "vendor-jspdf";
  if (packageName === "html2canvas") return "vendor-html2canvas";
  if (packageName === "dompurify") return "vendor-dompurify";
  if (packageName === "canvg") return "vendor-canvg";
  if (packageName === "recharts" || packageName === "d3-scale" || packageName === "d3-shape") return "vendor-charts";
  if (packageName === "date-fns" || packageName === "luxon") return "vendor-dates";
  if (packageName === "lucide-react") return "vendor-icons";
  if (packageName === "motion") return "vendor-motion";

  return `vendor-${packageName.replace("@", "").replace("/", "-")}`;
}

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
    plugins: [react(), devAnalyticsApi(merged)],
    build: {
      // Large editor/export libraries are lazy-loaded by route; warn only above that bounded chunk size.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: vendorChunkName,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Monorepo package (not published to npm). Vercel installs only apps/web — no workspace link.
        "@kora/sdk": path.resolve(repoRoot, "packages/kora-sdk/src/index.ts"),
      },
    },
  };
});
