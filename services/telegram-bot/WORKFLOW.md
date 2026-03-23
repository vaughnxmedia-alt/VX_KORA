# KORA Telegram Bot — Full workflow

Run the **full bot** for this flow (not the echo test):

```bash
cd services/telegram-bot
npm run dev
```

---

## 1. User sends `/start`

- **Handler:** `handleStartCommand` (command-handlers.ts)
- **Reply:** Welcome message that says:
  - "Welcome to KORA! I'm your AI-powered brand strategist..."
  - "To get started, type **@koranewstrategy**"
  - List of commands: /run, /status, /restart, /help, etc.

---

## 2. User types `@koranewstrategy`

- **Handler:** `handleNewStrategyTrigger` (message-handlers.ts)
- **Steps:**
  1. `getOrchestrator().startPipeline(telegramId, chatId, username)` → creates tenant (if new), creates pipeline run, stores context
  2. In-memory `activeSessions.set(telegramId, { runId, currentQuestionIndex: 0 })` so later messages are treated as intake answers
  3. Send: "Great! Let's build your brand strategy. I'll ask you a series of questions... Ready? Here's the first question:"
  4. `sendQuestion(bot, chatId, telegramId, 0, runId)` → sends first question from `INTAKE_QUESTIONS` (business/brand name)

---

## 3. User answers each question (questionnaire)

- **Handler:** `handleIntakeResponse` (message-handlers.ts) — only runs when `hasActiveSession(telegramId)` is true (set in step 2)
- **Steps per answer:**
  1. Get current question from `INTAKE_QUESTIONS[session.currentQuestionIndex]`
  2. `orchestrator.processIntakeAnswer(context, { questionId, questionText, rawAnswer })` → saves answer, may ask clarification
  3. If clarification needed: send clarification question, keep same question index
  4. If `result.isComplete` (agent says intake complete): clear session, send "Thank you! I'm now generating...", return; pipeline already started inside `processIntakeAnswer`
  5. Else: increment `currentQuestionIndex`; if more questions, send next via `sendQuestion(...)`; if no more, send "Thank you for completing all the questions!" and `orchestrator.runPostIntakePipeline(context)` (research → brand/audience/content generation → delivery)

---

## 4. After intake: pipeline (research + generation + delivery)

- **Triggered by:** `orchestrator.runPostIntakePipeline(context)` (from orchestrator.ts) — either from `processIntakeAnswer` when `isComplete`, or from message-handler when we've sent the last question
- **Steps:** Profile research → extended research → brand intelligence → audience intelligence → strategy intelligence → quality review → delivery (send Brand Blueprint, Content Strategy, Audience Analysis to user in Telegram)

---

## 5. Other commands (always available)

- **/run** — Trigger personalized insight run (single user)
- **/status** — Show progress (intake, pipeline stage)
- **/restart** — Start a new strategy session
- **/help** — Help text

---

## Connection summary

| Step | Trigger        | Handler / code              | Next step              |
|------|----------------|-----------------------------|-------------------------|
| 1    | /start         | handleStartCommand          | User types @koranewstrategy |
| 2    | @koranewstrategy | handleNewStrategyTrigger  | First question sent    |
| 3    | Any text (while in session) | handleIntakeResponse   | Next question or completion |
| 4    | Last answer / isComplete | runPostIntakePipeline | Research + delivery    |

**Echo test (`npm run test:bot`)** only verifies Telegram + token. It replies "Got it!" to most messages and, for `/start`, tells you to run `npm run dev` for the real flow.
