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

### 5. Start the Bot

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `@koranewstrategy` | Start new strategy intake |
| `/restart` | Restart intake from beginning |
| `/cancel` | Cancel current intake session |

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
