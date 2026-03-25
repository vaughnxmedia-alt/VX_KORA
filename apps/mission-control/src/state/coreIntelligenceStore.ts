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

const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString()

const initialRAGAgents: IndustryRAGAgent[] = []
const initialSources: IngestSource[] = []
const initialSchedules: IngestSchedule[] = []

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
