import { useState } from "react"
import { Globe, Key, Shield, Save, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Settings() {
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [openAIKey, setOpenAIKey] = useState("sk-proj-xxxxxxxxxxxxx")
  const [geminiKey, setGeminiKey] = useState("AIzaSyxxxxxxxxxx")

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-grey-900">Settings</h1>
        <p className="text-grey-500 mt-1">Configure integrations, API keys, and system settings.</p>
      </div>

      <div className="bg-white rounded-xl shadow-card">
        <div className="p-5 border-b border-grey-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Globe className="h-5 w-5 text-purple-600" /></div>
            <div><h2 className="font-semibold text-grey-900">Integrations</h2><p className="text-sm text-grey-500">Configure external service connections</p></div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-4 bg-grey-50 rounded-lg">
            <div><p className="font-medium text-grey-900">Supabase</p><p className="text-sm text-grey-500">Database and authentication</p></div>
            <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-grey-50 rounded-lg">
            <div><p className="font-medium text-grey-900">OpenAI</p><p className="text-sm text-grey-500">Embeddings and text generation</p></div>
            <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-grey-50 rounded-lg">
            <div><p className="font-medium text-grey-900">Google Gemini</p><p className="text-sm text-grey-500">Chat completions</p></div>
            <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card">
        <div className="p-5 border-b border-grey-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center"><Key className="h-5 w-5 text-yellow-600" /></div>
            <div><h2 className="font-semibold text-grey-900">API Keys</h2><p className="text-sm text-grey-500">Manage your API credentials</p></div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1">OpenAI API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input type={showOpenAIKey ? "text" : "password"} value={openAIKey} onChange={(e) => setOpenAIKey(e.target.value)} />
                <button onClick={() => setShowOpenAIKey(!showOpenAIKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600">
                  {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-grey-400 mt-1">Used for embeddings with text-embedding-3-small model</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1">Google Gemini API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input type={showGeminiKey ? "text" : "password"} value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} />
                <button onClick={() => setShowGeminiKey(!showGeminiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600">
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-grey-400 mt-1">Used for chat completions with gemini-1.5-flash</p>
          </div>
          <Button><Save className="h-4 w-4 mr-2" />Save Keys</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card">
        <div className="p-5 border-b border-grey-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><Shield className="h-5 w-5 text-red-600" /></div>
            <div><h2 className="font-semibold text-grey-900">Access Control</h2><p className="text-sm text-grey-500">Manage user permissions and roles</p></div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-grey-500">Access control settings coming soon.</p>
        </div>
      </div>
    </div>
  )
}
