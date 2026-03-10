import { useState } from "react"
import { 
  Bot, Settings, Save, RefreshCw, DollarSign, Zap, Clock,
  CheckCircle2, AlertTriangle, Info
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskConfig {
  taskType: string
  displayName: string
  description: string
  primaryProvider: "openai" | "gemini"
  primaryModel: string
  fallbackProvider: "openai" | "gemini" | null
  fallbackModel: string | null
  maxTokens: number
  temperature: number
  useLongContext: boolean
  costPer1kTokens: number
}

const mockTaskConfigs: TaskConfig[] = [
  { taskType: "embeddings", displayName: "Embeddings", description: "Vector embeddings for RAG", primaryProvider: "openai", primaryModel: "text-embedding-3-small", fallbackProvider: null, fallbackModel: null, maxTokens: 8192, temperature: 0, useLongContext: false, costPer1kTokens: 0.00002 },
  { taskType: "classification", displayName: "Classification", description: "Content categorization", primaryProvider: "openai", primaryModel: "gpt-4o-mini", fallbackProvider: "gemini", fallbackModel: "gemini-1.5-flash", maxTokens: 1000, temperature: 0, useLongContext: false, costPer1kTokens: 0.00015 },
  { taskType: "tagging", displayName: "Tagging", description: "Entity and topic tagging", primaryProvider: "openai", primaryModel: "gpt-4o-mini", fallbackProvider: "gemini", fallbackModel: "gemini-1.5-flash", maxTokens: 500, temperature: 0, useLongContext: false, costPer1kTokens: 0.00015 },
  { taskType: "relevance_scoring", displayName: "Relevance Scoring", description: "Content relevance assessment", primaryProvider: "openai", primaryModel: "gpt-4o-mini", fallbackProvider: "gemini", fallbackModel: "gemini-1.5-flash", maxTokens: 200, temperature: 0, useLongContext: false, costPer1kTokens: 0.00015 },
  { taskType: "summarization", displayName: "Summarization", description: "Content summarization", primaryProvider: "openai", primaryModel: "gpt-4o-mini", fallbackProvider: "gemini", fallbackModel: "gemini-1.5-flash", maxTokens: 2000, temperature: 0.3, useLongContext: false, costPer1kTokens: 0.00015 },
  { taskType: "transcript_digestion", displayName: "Transcript Digestion", description: "Video/audio transcript processing", primaryProvider: "gemini", primaryModel: "gemini-1.5-pro", fallbackProvider: "openai", fallbackModel: "gpt-4o", maxTokens: 8000, temperature: 0.3, useLongContext: true, costPer1kTokens: 0.00125 },
  { taskType: "long_form_synthesis", displayName: "Long-Form Synthesis", description: "Multi-source synthesis", primaryProvider: "gemini", primaryModel: "gemini-1.5-pro", fallbackProvider: "openai", fallbackModel: "gpt-4o", maxTokens: 4000, temperature: 0.5, useLongContext: true, costPer1kTokens: 0.00125 },
  { taskType: "weekly_brief", displayName: "Weekly Brief", description: "Weekly digest generation", primaryProvider: "gemini", primaryModel: "gemini-1.5-pro", fallbackProvider: "openai", fallbackModel: "gpt-4o", maxTokens: 6000, temperature: 0.5, useLongContext: true, costPer1kTokens: 0.00125 },
  { taskType: "strategy_generation", displayName: "Strategy Generation", description: "Content strategy creation", primaryProvider: "gemini", primaryModel: "gemini-1.5-pro", fallbackProvider: "openai", fallbackModel: "gpt-4o", maxTokens: 4000, temperature: 0.7, useLongContext: true, costPer1kTokens: 0.00125 },
  { taskType: "structured_output", displayName: "Structured Output", description: "JSON and structured data", primaryProvider: "openai", primaryModel: "gpt-4o", fallbackProvider: "gemini", fallbackModel: "gemini-1.5-pro", maxTokens: 2000, temperature: 0, useLongContext: false, costPer1kTokens: 0.005 },
]

interface CostThresholds {
  dailyBudget: number
  monthlyBudget: number
  perRequestMax: number
  alertAtPercent: number
}

const mockThresholds: CostThresholds = {
  dailyBudget: 50,
  monthlyBudget: 1000,
  perRequestMax: 1,
  alertAtPercent: 80,
}

export default function LLMRouter() {
  const [configs] = useState<TaskConfig[]>(mockTaskConfigs)
  const [thresholds] = useState<CostThresholds>(mockThresholds)
  const [selectedTask, setSelectedTask] = useState<TaskConfig | null>(null)

  const openaiTasks = configs.filter(c => c.primaryProvider === "openai").length
  const geminiTasks = configs.filter(c => c.primaryProvider === "gemini").length
  const longContextTasks = configs.filter(c => c.useLongContext).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">LLM Router</h1>
          <p className="text-gray-400 text-sm">Configure task-to-model routing and cost management</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
            <RefreshCw className="h-4 w-4" />
            Reset Defaults
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">OpenAI Tasks</p>
          <p className="text-2xl font-bold text-emerald-400">{openaiTasks}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Gemini Tasks</p>
          <p className="text-2xl font-bold text-blue-400">{geminiTasks}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Long Context</p>
          <p className="text-2xl font-bold text-purple-400">{longContextTasks}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Monthly Budget</p>
          <p className="text-2xl font-bold text-white">${thresholds.monthlyBudget}</p>
        </div>
      </div>

      {/* Cost Thresholds */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          Cost Thresholds
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Daily Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                defaultValue={thresholds.dailyBudget}
                className="w-full bg-gray-900 border border-white/10 rounded-lg pl-7 pr-4 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">Monthly Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                defaultValue={thresholds.monthlyBudget}
                className="w-full bg-gray-900 border border-white/10 rounded-lg pl-7 pr-4 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">Max per Request</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                step="0.1"
                defaultValue={thresholds.perRequestMax}
                className="w-full bg-gray-900 border border-white/10 rounded-lg pl-7 pr-4 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">Alert at %</label>
            <div className="relative">
              <input
                type="number"
                defaultValue={thresholds.alertAtPercent}
                className="w-full bg-gray-900 border border-white/10 rounded-lg pl-4 pr-7 py-2 text-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Mappings */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-400" />
          Task Mappings
        </h2>
        <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Task</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Primary</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Fallback</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Max Tokens</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Temp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Long Context</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cost/1k</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {configs.map((config) => (
                <tr key={config.taskType} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">{config.displayName}</p>
                      <p className="text-gray-500 text-xs">{config.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        config.primaryProvider === "openai" 
                          ? "bg-emerald-400/10 text-emerald-400" 
                          : "bg-blue-400/10 text-blue-400"
                      )}>
                        {config.primaryProvider}
                      </span>
                      <span className="text-gray-300 text-sm">{config.primaryModel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {config.fallbackProvider ? (
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          config.fallbackProvider === "openai" 
                            ? "bg-emerald-400/10 text-emerald-400" 
                            : "bg-blue-400/10 text-blue-400"
                        )}>
                          {config.fallbackProvider}
                        </span>
                        <span className="text-gray-400 text-sm">{config.fallbackModel}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-sm">{config.maxTokens.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-sm">{config.temperature}</span>
                  </td>
                  <td className="px-4 py-3">
                    {config.useLongContext ? (
                      <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-sm">${config.costPer1kTokens.toFixed(5)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => setSelectedTask(config)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-400 font-medium">Routing Strategy</p>
            <p className="text-gray-400 text-sm mt-1">
              OpenAI is preferred for embeddings, classification, tagging, and structured outputs due to lower latency and deterministic results.
              Gemini is preferred for long-context tasks like transcript digestion, synthesis, and strategy generation due to its large context window.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
