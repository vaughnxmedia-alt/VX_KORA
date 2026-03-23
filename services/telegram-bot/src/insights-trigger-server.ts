/**
 * Local HTTP trigger for Mission Control "Trigger Run" → same job as npm run send-insights.
 *
 * Run in a terminal (keep open while using Mission Control):
 *   cd services/telegram-bot && npm run insights:trigger-server
 *
 * Then click Trigger Run in Ingest Runs, or: curl -X POST http://127.0.0.1:3847/run
 */
import http from "http"
import { spawn } from "child_process"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const botRoot = path.join(__dirname, "..")
dotenv.config({ path: path.join(botRoot, ".env") })

const PORT = Number(process.env.INSIGHTS_TRIGGER_PORT || 3847)
let running = false

function cors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-trigger-secret")
}

const server = http.createServer((req, res) => {
  cors(res)
  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }
  const path = req.url?.split("?")[0] || "/"
  if (req.method === "GET" && (path === "/" || path === "/run")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>KORA Insights Trigger</title></head>
<body style="font-family:system-ui;max-width:560px;margin:2rem auto;padding:0 1rem">
<h1>Trigger server is running</h1>
<p><strong>/run</strong> only accepts <code>POST</code> (opening this page in the browser is a GET — it does not start a run).</p>
<p><strong>To run insights:</strong></p>
<ol>
<li>Open <strong>Mission Control</strong> → Ingest Runs → click <strong>Trigger Run</strong>, or</li>
<li>Terminal: <code>curl -X POST http://127.0.0.1:${PORT}/run</code></li>
</ol>
<p style="color:#666">If you see "connection refused" here, start this server first:<br>
<code>cd VX_KORA && npm run insights:trigger-server</code></p>
</body></html>`)
    return
  }
  if (req.method !== "POST" || path !== "/run") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Not found")
    return
  }

  const secret = process.env.TRIGGER_RUN_SECRET?.trim()
  if (secret && req.headers["x-trigger-secret"] !== secret) {
    res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" })
    res.end(JSON.stringify({ error: "Unauthorized" }))
    return
  }

  if (running) {
    res.writeHead(429, { "Content-Type": "application/json; charset=utf-8" })
    res.end(JSON.stringify({ error: "A run is already in progress" }))
    return
  }

  const chunks: Buffer[] = []
  req.on("data", (chunk) => chunks.push(chunk))
  req.on("end", () => {
    let body: { telegram_id?: number } = {}
    try {
      const raw = Buffer.concat(chunks).toString("utf8")
      if (raw.trim()) body = JSON.parse(raw) as typeof body
    } catch {
      /* ignore */
    }
    const telegramId = typeof body.telegram_id === "number" ? body.telegram_id : undefined
    const env = { ...process.env }
    if (telegramId !== undefined) {
      env.INSIGHTS_SINGLE_TELEGRAM_ID = String(telegramId)
    }

    running = true
    res.writeHead(202, { "Content-Type": "application/json; charset=utf-8" })
    res.end(
      JSON.stringify({
        ok: true,
        message: telegramId
          ? `Insight run started for telegram_id ${telegramId}. Watch terminal and Telegram.`
          : "Deep insights run started. Watch this terminal and Telegram.",
      })
    )

    const child = spawn("npx", ["tsx", "src/send-deep-insights.ts"], {
      cwd: botRoot,
      shell: true,
      env,
      stdio: "inherit",
    })
    child.on("close", (code) => {
      running = false
      console.log(`\n[insights-trigger-server] send-deep-insights exited with code ${code}\n`)
    })
    child.on("error", (err) => {
      running = false
      console.error("[insights-trigger-server] spawn error:", err)
    })
  })
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`KORA Insights Trigger Server`)
  console.log(`  POST http://127.0.0.1:${PORT}/run`)
  console.log(`  Mission Control "Trigger Run" uses this URL.`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  console.log("Press Ctrl+C to stop. (Exit code 130 is normal when you stop the server.)")
})

process.on("SIGINT", () => {
  console.log("\n[insights-trigger-server] Stopping (Ctrl+C). Exit code 130 is normal.")
  process.exit(130)
})
