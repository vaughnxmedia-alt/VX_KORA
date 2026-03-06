import { create } from "zustand"
import type { IndustryRAGAgent, IngestSource, IngestSchedule } from "@/lib/types"

interface CoreIntelligenceStore {
  ragAgents: IndustryRAGAgent[]
  sources: IngestSource[]
  schedules: IngestSchedule[]
  
  getRAGAgentByIndustry: (industry: string) => IndustryRAGAgent | undefined
  getSourcesByIndustry: (industry: string) => IngestSource[]
  getSchedulesByClient: (clientId: string) => IngestSchedule[]
  triggerSync: (ragAgentId: string) => void
  addIndustryRAG: (industry: string) => void
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()

const initialRAGAgents: IndustryRAGAgent[] = [
  {
    id: "rag-marketing-pr",
    industry: "Marketing & PR",
    displayName: "Marketing & PR Intelligence",
    description: "Industry knowledge for marketing, public relations, brand strategy, and communications.",
    status: "active",
    sourcesCount: 24,
    documentsCount: 15420,
    embeddingsCount: 892000,
    lastSyncAt: hoursAgo(1),
    nextSyncAt: hoursFromNow(23),
    syncFrequency: "daily",
    clients: ["JahKnowsPR", "Wellness Co", "TechStart Inc", "Artisan Foods", "Mindful Media"],
    createdAt: daysAgo(180),
    updatedAt: hoursAgo(1),
  },
]

const initialSources: IngestSource[] = [
  { id: "src-001", name: "PR Week", url: "https://prweek.com/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 2450, errorRate: 0.01 },
  { id: "src-002", name: "AdAge", url: "https://adage.com/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 3120, errorRate: 0.02 },
  { id: "src-003", name: "Marketing Week", url: "https://marketingweek.com/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 1890, errorRate: 0.01 },
  { id: "src-004", name: "HubSpot Blog", url: "https://blog.hubspot.com/marketing/rss", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 1540, errorRate: 0.0 },
  { id: "src-005", name: "Content Marketing Institute", url: "https://contentmarketinginstitute.com/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 980, errorRate: 0.02 },
  { id: "src-006", name: "Social Media Today", url: "https://socialmediatoday.com/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 2100, errorRate: 0.01 },
  { id: "src-007", name: "Muck Rack Blog", url: "https://muckrack.com/blog/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 420, errorRate: 0.0 },
  { id: "src-008", name: "Spin Sucks", url: "https://spinsucks.com/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 650, errorRate: 0.01 },
  { id: "src-009", name: "The Drum", url: "https://thedrum.com/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(2), nextFetchAt: hoursFromNow(22), itemsCount: 1780, errorRate: 0.03 },
  { id: "src-010", name: "Marketing Land", url: "https://marketingland.com/feed", type: "rss", industry: "Marketing & PR", isActive: true, lastFetchAt: hoursAgo(1), nextFetchAt: hoursFromNow(23), itemsCount: 890, errorRate: 0.01 },
]

const initialSchedules: IngestSchedule[] = [
  { id: "sched-001", clientId: "jahknowspr", clientName: "JahKnowsPR", frequency: "daily", lastRunAt: hoursAgo(1), nextRunAt: hoursFromNow(23), status: "completed", itemsIngested: 47 },
  { id: "sched-002", clientId: "c1", clientName: "Wellness Co", frequency: "weekly", lastRunAt: daysAgo(3), nextRunAt: hoursFromNow(96), status: "scheduled", itemsIngested: 0 },
  { id: "sched-003", clientId: "c2", clientName: "TechStart Inc", frequency: "weekly", lastRunAt: daysAgo(5), nextRunAt: hoursFromNow(48), status: "scheduled", itemsIngested: 0 },
  { id: "sched-004", clientId: "c3", clientName: "Artisan Foods", frequency: "weekly", lastRunAt: daysAgo(2), nextRunAt: hoursFromNow(120), status: "scheduled", itemsIngested: 0 },
  { id: "sched-005", clientId: "c5", clientName: "Mindful Media", frequency: "weekly", lastRunAt: daysAgo(1), nextRunAt: hoursFromNow(144), status: "scheduled", itemsIngested: 0 },
]

export const useCoreIntelligenceStore = create<CoreIntelligenceStore>((set, get) => ({
  ragAgents: initialRAGAgents,
  sources: initialSources,
  schedules: initialSchedules,

  getRAGAgentByIndustry: (industry) => 
    get().ragAgents.find((agent) => agent.industry === industry),

  getSourcesByIndustry: (industry) => 
    get().sources.filter((source) => source.industry === industry),

  getSchedulesByClient: (clientId) => 
    get().schedules.filter((schedule) => schedule.clientId === clientId),

  triggerSync: (ragAgentId) => {
    set((state) => ({
      ragAgents: state.ragAgents.map((agent) =>
        agent.id === ragAgentId
          ? { ...agent, status: "building" as const }
          : agent
      ),
    }))

    setTimeout(() => {
      set((state) => ({
        ragAgents: state.ragAgents.map((agent) =>
          agent.id === ragAgentId
            ? {
                ...agent,
                status: "active" as const,
                lastSyncAt: new Date().toISOString(),
                documentsCount: agent.documentsCount + Math.floor(Math.random() * 50),
                embeddingsCount: agent.embeddingsCount + Math.floor(Math.random() * 3000),
                updatedAt: new Date().toISOString(),
              }
            : agent
        ),
      }))
    }, 3000)
  },

  addIndustryRAG: (industry) => {
    const id = `rag-${industry.toLowerCase().replace(/\s+/g, "-")}`
    
    if (get().ragAgents.find((a) => a.id === id)) return

    const newAgent: IndustryRAGAgent = {
      id,
      industry,
      displayName: `${industry} Intelligence`,
      description: `Industry knowledge base for ${industry} sector.`,
      status: "building",
      sourcesCount: 0,
      documentsCount: 0,
      embeddingsCount: 0,
      lastSyncAt: null,
      nextSyncAt: hoursFromNow(24),
      syncFrequency: "weekly",
      clients: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    set((state) => ({
      ragAgents: [...state.ragAgents, newAgent],
    }))

    setTimeout(() => {
      set((state) => ({
        ragAgents: state.ragAgents.map((agent) =>
          agent.id === id
            ? { ...agent, status: "active" as const, sourcesCount: 5 }
            : agent
        ),
      }))
    }, 5000)
  },
}))
