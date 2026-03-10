#!/bin/bash

echo "🤖 KORA Telegram Bot Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env exists
if [ -f .env ]; then
  echo "✅ .env file exists"
else
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ .env file created"
fi

echo ""
echo "📋 Required Configuration:"
echo ""
echo "1. TELEGRAM_BOT_TOKEN"
echo "   - Go to https://t.me/botfather"
echo "   - Send /newbot and follow prompts"
echo "   - Copy the token to .env"
echo ""
echo "2. OPENAI_API_KEY"
echo "   - Go to https://platform.openai.com/api-keys"
echo "   - Create a new API key"
echo "   - Copy the key to .env"
echo ""
echo "3. SUPABASE_URL and SUPABASE_SERVICE_KEY (optional)"
echo "   - Go to your Supabase project settings"
echo "   - Copy URL and service role key to .env"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if required env vars are set
if [ -f .env ]; then
  source .env
  
  if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ "$TELEGRAM_BOT_TOKEN" = "your_telegram_bot_token_here" ]; then
    echo "⚠️  TELEGRAM_BOT_TOKEN not configured"
  else
    echo "✅ TELEGRAM_BOT_TOKEN is set"
  fi
  
  if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
    echo "⚠️  OPENAI_API_KEY not configured"
  else
    echo "✅ OPENAI_API_KEY is set"
  fi
fi

echo ""
echo "Once configured, run:"
echo "  npm run dev"
echo ""
