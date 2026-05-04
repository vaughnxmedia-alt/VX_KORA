import fs from "node:fs";
import path from "node:path";

const APP_ROOT = process.cwd();
const REPO_ROOT = path.resolve(APP_ROOT, "../..");
const ENV_PATHS = [
  path.join(REPO_ROOT, ".env"),
  path.join(APP_ROOT, ".env"),
  path.join(APP_ROOT, ".env.local"),
  path.join(APP_ROOT, ".env.development"),
];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const parsed = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    parsed[key] = value;
  }
  return parsed;
}

const merged = ENV_PATHS.reduce(
  (env, filePath) => ({ ...env, ...readEnvFile(filePath) }),
  { ...process.env },
);

const hasUrl = Boolean(merged.VITE_SUPABASE_URL?.trim());
const hasKey = Boolean(
  merged.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || merged.VITE_SUPABASE_ANON_KEY?.trim(),
);

if (!hasUrl || !hasKey) {
  const checked = ENV_PATHS.map((filePath) => `  - ${filePath}`).join("\n");
  console.error(
    [
      "[apps/web] Missing Supabase browser env.",
      "",
      "The local site needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) before starting.",
      "Without them, The Brief can load the shell but cannot fetch blog posts.",
      "",
      "Checked:",
      checked,
      "",
      "Restore apps/web/.env from your existing local copy or Supabase Project Settings -> API.",
    ].join("\n"),
  );
  process.exit(1);
}
