import { useState } from "react"
import { Globe, Key, Shield, Save, Eye, EyeOff, Send, MessageCircle, Bell, BellOff, Clock, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const JAHKNOWS_CHAT_ID = "8216104620"

export function Settings() {
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showTelegramToken, setShowTelegramToken] = useState(false)
  const [openAIKey, setOpenAIKey] = useState("sk-proj-xxxxxxxxxxxxx")
  const [geminiKey, setGeminiKey] = useState("AIzaSyxxxxxxxxxx")
  /** Paste token when testing; bot scripts use services/telegram-bot/.env instead. */
  const [telegramBotToken, setTelegramBotToken] = useState("")
  const [telegramChatId, setTelegramChatId] = useState(JAHKNOWS_CHAT_ID)
  const [notifyDeliverables, setNotifyDeliverables] = useState(true)
  const [notifyIngest, setNotifyIngest] = useState(false)
  const [dailyBriefingTime, setDailyBriefingTime] = useState("07:00")
  const [dailyBriefingEnabled, setDailyBriefingEnabled] = useState(true)
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success">("idle")

  const testTelegramConnection = async () => {
    setTestStatus("loading")
    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: "✅ *Test Successful!*\n\nYour KORA Mission Control is connected.\n\n_Telegram notifications are working._",
          parse_mode: "Markdown",
        }),
      })
      if (response.ok) {
        setTestStatus("success")
        setTimeout(() => setTestStatus("idle"), 3000)
      } else {
        setTestStatus("error")
        setTimeout(() => setTestStatus("idle"), 3000)
      }
    } catch {
      setTestStatus("error")
      setTimeout(() => setTestStatus("idle"), 3000)
    }
  }

  const saveTelegramSettings = async () => {
    setSaveStatus("loading")
    await new Promise(r => setTimeout(r, 500))
    setSaveStatus("success")
    setTimeout(() => setSaveStatus("idle"), 2000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-grey-500 mt-1">Configure integrations, API keys, and system settings.</p>
      </div>

      <div className="bg-grey-900/50 border border-grey-800 rounded-xl">
        <div className="p-5 border-b border-grey-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan/20 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-cyan" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Telegram Notifications</h2>
              <p className="text-sm text-grey-500">Receive KORA deliverables directly in Telegram</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-grey-400 mb-1">Bot Token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  type={showTelegramToken ? "text" : "password"} 
                  value={telegramBotToken} 
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="bg-grey-800 border-grey-700 text-white"
                />
                <button onClick={() => setShowTelegramToken(!showTelegramToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500 hover:text-grey-300">
                  {showTelegramToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-grey-600 mt-1">Get this from @BotFather on Telegram</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-grey-400 mb-1">Chat ID</label>
            <div className="flex gap-2">
              <Input 
                type="text" 
                value={telegramChatId} 
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Your chat ID or group ID"
                className="bg-grey-800 border-grey-700 text-white flex-1"
              />
              <Button 
                variant="outline" 
                onClick={testTelegramConnection} 
                disabled={testStatus === "loading"}
                className={`border-grey-700 text-grey-300 hover:bg-grey-800 min-w-[100px] ${
                  testStatus === "success" ? "border-green text-green" : 
                  testStatus === "error" ? "border-red text-red" : ""
                }`}
              >
                {testStatus === "loading" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending</>
                ) : testStatus === "success" ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Sent!</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Test</>
                )}
              </Button>
            </div>
            <p className="text-xs text-grey-600 mt-1">Message @userinfobot to get your chat ID</p>
          </div>
          
          <div className="pt-4 border-t border-grey-800">
            <p className="text-sm font-medium text-grey-400 mb-3">Daily Briefing Schedule</p>
            <div className="flex items-center gap-4 p-3 bg-grey-800/50 rounded-lg mb-4">
              <div className="flex items-center gap-3 flex-1">
                <Clock className="h-4 w-4 text-cyan" />
                <div>
                  <p className="text-sm font-medium text-white">Daily Content Strategy Briefing</p>
                  <p className="text-xs text-grey-500">Receive industry insights and content ideas every morning</p>
                </div>
              </div>
              <input
                type="time"
                value={dailyBriefingTime}
                onChange={(e) => setDailyBriefingTime(e.target.value)}
                className="bg-grey-700 border border-grey-600 rounded px-3 py-1.5 text-white text-sm"
              />
              <input 
                type="checkbox" 
                checked={dailyBriefingEnabled} 
                onChange={(e) => setDailyBriefingEnabled(e.target.checked)}
                className="w-5 h-5 rounded bg-grey-700 border-grey-600 text-cyan focus:ring-cyan"
              />
            </div>
            
            <p className="text-sm font-medium text-grey-400 mb-3">Notification Preferences</p>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-grey-800/50 rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-green" />
                  <div>
                    <p className="text-sm font-medium text-white">Deliverable Notifications</p>
                    <p className="text-xs text-grey-500">Get notified when KORA agents complete deliverables</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifyDeliverables} 
                  onChange={(e) => setNotifyDeliverables(e.target.checked)}
                  className="w-5 h-5 rounded bg-grey-700 border-grey-600 text-cyan focus:ring-cyan"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-grey-800/50 rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <BellOff className="h-4 w-4 text-grey-500" />
                  <div>
                    <p className="text-sm font-medium text-white">Ingest Notifications</p>
                    <p className="text-xs text-grey-500">Get notified when Core Intelligence completes data ingestion</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifyIngest} 
                  onChange={(e) => setNotifyIngest(e.target.checked)}
                  className="w-5 h-5 rounded bg-grey-700 border-grey-600 text-cyan focus:ring-cyan"
                />
              </label>
            </div>
          </div>
          
          <Button 
            onClick={saveTelegramSettings}
            disabled={saveStatus === "loading"}
            className="bg-cyan hover:bg-cyan/80 text-background"
          >
            {saveStatus === "loading" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : saveStatus === "success" ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" />Saved!</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Telegram Settings</>
            )}
          </Button>
        </div>
      </div>

      <div className="bg-grey-900/50 border border-grey-800 rounded-xl">
        <div className="p-5 border-b border-grey-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple/20 rounded-lg flex items-center justify-center"><Globe className="h-5 w-5 text-purple" /></div>
            <div><h2 className="font-semibold text-white">Integrations</h2><p className="text-sm text-grey-500">Configure external service connections</p></div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-4 bg-grey-800/50 rounded-lg">
            <div><p className="font-medium text-white">Supabase</p><p className="text-sm text-grey-500">Database and authentication</p></div>
            <span className="text-sm bg-green/20 text-green px-2 py-0.5 rounded">Connected</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-grey-800/50 rounded-lg">
            <div><p className="font-medium text-white">OpenAI</p><p className="text-sm text-grey-500">Embeddings and text generation</p></div>
            <span className="text-sm bg-green/20 text-green px-2 py-0.5 rounded">Connected</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-grey-800/50 rounded-lg">
            <div><p className="font-medium text-white">Google Gemini</p><p className="text-sm text-grey-500">Chat completions</p></div>
            <span className="text-sm bg-green/20 text-green px-2 py-0.5 rounded">Connected</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-grey-800/50 rounded-lg">
            <div><p className="font-medium text-white">Telegram</p><p className="text-sm text-grey-500">Deliverable notifications</p></div>
            <span className={`text-sm px-2 py-0.5 rounded ${telegramChatId ? "bg-green/20 text-green" : "bg-yellow/20 text-yellow"}`}>
              {telegramChatId ? "Connected" : "Not configured"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-grey-900/50 border border-grey-800 rounded-xl">
        <div className="p-5 border-b border-grey-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow/20 rounded-lg flex items-center justify-center"><Key className="h-5 w-5 text-yellow" /></div>
            <div><h2 className="font-semibold text-white">API Keys</h2><p className="text-sm text-grey-500">Manage your API credentials</p></div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-grey-400 mb-1">OpenAI API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  type={showOpenAIKey ? "text" : "password"} 
                  value={openAIKey} 
                  onChange={(e) => setOpenAIKey(e.target.value)}
                  className="bg-grey-800 border-grey-700 text-white"
                />
                <button onClick={() => setShowOpenAIKey(!showOpenAIKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500 hover:text-grey-300">
                  {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-grey-600 mt-1">Used for embeddings with text-embedding-3-small model</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-grey-400 mb-1">Google Gemini API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  type={showGeminiKey ? "text" : "password"} 
                  value={geminiKey} 
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="bg-grey-800 border-grey-700 text-white"
                />
                <button onClick={() => setShowGeminiKey(!showGeminiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500 hover:text-grey-300">
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-grey-600 mt-1">Used for chat completions with gemini-1.5-flash</p>
          </div>
          <Button className="bg-yellow hover:bg-yellow/80 text-background"><Save className="h-4 w-4 mr-2" />Save Keys</Button>
        </div>
      </div>

      <div className="bg-grey-900/50 border border-grey-800 rounded-xl">
        <div className="p-5 border-b border-grey-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red/20 rounded-lg flex items-center justify-center"><Shield className="h-5 w-5 text-red" /></div>
            <div><h2 className="font-semibold text-white">Access Control</h2><p className="text-sm text-grey-500">Manage user permissions and roles</p></div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-grey-500">Access control settings coming soon.</p>
        </div>
      </div>
    </div>
  )
}
