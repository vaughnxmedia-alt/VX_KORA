# KORA Telegram Bot

AI-powered Telegram bot for client onboarding and strategy generation.

## Features

- **@koranewstrategy Command**: Initiates a comprehensive intake flow
- **Brand Identity Blueprint**: Generates professional brand positioning documents
- **Content Strategy**: Creates personalized content pillars and posting schedules
- **Audience Analysis**: Builds detailed target audience profiles

## Setup

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token provided

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Database Migration

Apply the migration in `apps/web/supabase/migrations/20260306200000_telegram_intake_schema.sql` to your Supabase project.

### 5. Start the Bot (full flow: welcome + questionnaire)

**Use `npm run dev` for the real bot.** The bot only replies when this process is running. If users get no response (e.g. to `/start`), start the bot and keep it running.

See [WORKFLOW.md](./WORKFLOW.md) for how /start → @koranewstrategy → questionnaire → pipeline are connected.

Development:
```bash
npm run dev
```

Production (run 24/7, e.g. with systemd or PM2):
```bash
npm run build
npm start
```

Ensure `TELEGRAM_BOT_TOKEN` in `.env` is the BotFather token for the bot you want (e.g. `BOT_USERNAME=@VX_kora_bot`).

### Bot not responding?

1. **Run the echo test first** (from `services/telegram-bot`):
   ```bash
   npm run test:bot
   ```
   Send any message to your bot in Telegram. You should see `Received: ...` in the terminal and the bot should reply **"Got it!"**.  
   - If that **works**: token and Telegram are fine; the full bot may be failing in a handler (check for errors in the terminal when you run `npm run dev`).  
   - If that **fails** or you never see `Received`: wrong token, wrong bot, or run from the wrong directory (must run from `services/telegram-bot` so `.env` is found).

2. **Run the full bot from the bot directory** — Always `cd` into `services/telegram-bot` then run `npm run dev`. You should see `[incoming] <chatId> <text>` in the console for every message. If you see `[incoming]` but no reply, a handler is failing (check for errors above it).

3. **Check the token** — In `services/telegram-bot/.env`, `TELEGRAM_BOT_TOKEN` must be the token from BotFather for the exact bot you message (e.g. @VX_kora_bot). No spaces or quotes around the value.

4. **Polling errors** — If you see `Telegram polling error` or `Polling error:` in the console, the token may be invalid or revoked. Get a new token from BotFather and update `.env`.

5. **409 Conflict: "only one bot instance is running"** — Telegram allows only **one** long-polling connection per bot token. If you see this error:
   - **Stop every other place** the bot is running: close the other terminal where you ran `npm run dev`, and in Cursor stop any background "Run" of the bot.
   - Run `npm run dev` in **only one** terminal. The 409 will stop once no other process is using the same token to poll.

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and command list |
| `/run` | Trigger your personalized insight run (single user) |
| `@koranewstrategy` | Start new strategy intake |
| `/restart` | Restart intake from beginning |
| `/cancel` | Cancel current intake session |
| `/help` | Get help |
| `/status` | Check your progress |

## Intake Flow

The bot guides users through 4 phases:

### Phase 1: Introduction
- Name and business information
- Social media handles
- Website details

### Phase 2: Brand Identity Blueprint
- Brand story and origin
- Mission and vision
- Core values
- Brand personality and voice
- Unique value proposition

### Phase 3: Content Strategy
- Content pillars
- Posting frequency
- Platform priorities
- Content goals

### Phase 4: Target Audience Analysis
- Ideal customer profile
- Pain points and desires
- Audience segments
- Platform preferences

## Generated Documents

After completing the intake, the bot generates three professional documents:

1. **Brand Identity Blueprint**
   - Positioning statement
   - Mission & vision
   - Core values
   - Brand voice guidelines
   - Brand story

2. **Content Strategy**
   - Content pillars with examples
   - Posting schedule
   - Platform-specific strategies
   - Example week of content
   - Hashtag recommendations

3. **Audience Analysis**
   - Audience segments
   - Platform breakdown
   - Personality types
   - Content that attracts
   - Audience flywheel

## Architecture

```
services/telegram-bot/
├── src/
│   ├── index.ts           # Entry point
│   ├── bot-handler.ts     # Message handling
│   ├── intake-questions.ts # Question configuration
│   ├── strategy-generator.ts # OpenAI integration
│   ├── database.ts        # Supabase integration
│   └── types.ts           # TypeScript interfaces
├── package.json
├── tsconfig.json
└── README.md
```

## Testing with JahKnowsPR

To test the bot:

1. Start the bot: `npm run dev`
2. Open Telegram and find your bot
3. Send `@koranewstrategy`
4. Complete the intake flow
5. Review the generated strategy documents

## Production Deployment

For production, consider:

1. **Hosting**: Deploy to a server that runs 24/7 (AWS, DigitalOcean, Railway, etc.)
2. **Process Manager**: Use PM2 or similar to keep the bot running
3. **Logging**: Add proper logging for monitoring
4. **Rate Limiting**: Implement rate limiting for high traffic

```bash
# Using PM2
npm install -g pm2
npm run build
pm2 start dist/index.js --name "kora-telegram-bot"
```

## Customization

### Modifying Questions

Edit `src/intake-questions.ts` to customize the intake questions. Each question supports:

- `validation`: "text", "list", "url", "choice"
- `choices`: Array of options for choice/list questions
- `examples`: Example answers to guide users
- `required`: Whether the question is required

### Modifying Document Generation

Edit `src/strategy-generator.ts` to customize the OpenAI prompts and document format.

## License

Proprietary - VaughnX Technology LLC
