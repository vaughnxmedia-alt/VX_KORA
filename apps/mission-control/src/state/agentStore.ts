import { create } from "zustand"

export type AgentStatus = "idle" | "running" | "complete" | "error"

export interface Agent {
  id: string
  name: string
  description: string
  status: AgentStatus
  icon: string
  route: string
  deliverables: string[]
  lastRun?: Date
}

export interface Client {
  id: string
  name: string
  businessName: string | null
  email: string | null
  status: string | null
  createdAt: string
}

export interface Deliverable {
  id: string
  agentId: string
  clientId: string
  clientName: string
  title: string
  status: "pending" | "in_progress" | "complete" | "failed"
  createdAt: Date
  completedAt?: Date
  data?: Record<string, unknown>
}

interface AgentStore {
  agents: Agent[]
  clients: Client[]
  selectedClientId: string | null
  deliverables: Deliverable[]
  setSelectedClient: (clientId: string | null) => void
  setAgentStatus: (id: string, status: AgentStatus) => void
  runAgent: (id: string, clientId?: string) => void
  resetAgent: (id: string) => void
  getAgentById: (id: string) => Agent | undefined
  getDeliverablesByAgent: (agentId: string, clientId?: string | null) => Deliverable[]
  getDeliverablesByClient: (clientId: string) => Deliverable[]
}

const initialAgents: Agent[] = [
  {
    id: "intake-clarifier",
    name: "Intake Clarifier",
    description: "Validates and cleans incoming client requests. Ensures the Visionary Brand Blueprint data is complete.",
    status: "idle",
    icon: "clipboard-check",
    route: "/agents/intake",
    deliverables: ["Validated Intake Form", "Data Completeness Report", "Missing Fields List"],
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Scrapes and gathers credible sources. Collects industry insights, audience data, and competitive analysis.",
    status: "idle",
    icon: "search",
    route: "/agents/research",
    deliverables: ["Industry Report", "Competitor Analysis", "Market Trends", "Source Citations"],
  },
  {
    id: "audience-intelligence",
    name: "Audiences",
    description: "Builds audience profiles. Identifies demographics, behaviors, and interests.",
    status: "idle",
    icon: "users",
    route: "/agents/audience",
    deliverables: ["Audience Persona", "Demographics Report", "Behavioral Insights", "Interest Mapping"],
  },
  {
    id: "brand-identity",
    name: "Brand Identity",
    description: "Determines tone, voice, positioning, and messaging for the brand.",
    status: "idle",
    icon: "fingerprint",
    route: "/agents/brand",
    deliverables: ["Brand Voice Guide", "Tone Matrix", "Positioning Statement", "Key Messages"],
  },
  {
    id: "content-strategy",
    name: "Content Strategy",
    description: "Generates content strategy reports. Creates topic clusters and storytelling angles.",
    status: "idle",
    icon: "file-text",
    route: "/agents/content",
    deliverables: ["Content Strategy", "Topic Clusters", "Content Pillars", "Storytelling Framework"],
  },
  {
    id: "campaign-builder",
    name: "Campaign Builder",
    description: "Converts strategies into actionable PR campaigns with deliverables.",
    status: "idle",
    icon: "rocket",
    route: "/agents/campaigns",
    deliverables: ["Campaign Plan", "Tactical Calendar", "Asset List", "KPI Targets"],
  },
  {
    id: "pdf-report-builder",
    name: "PDF Report Builder",
    description: "Assembles the final Brand Blueprint report as a polished PDF document.",
    status: "idle",
    icon: "file-output",
    route: "/agents/report",
    deliverables: ["Brand Blueprint PDF", "Executive Summary", "Full Report"],
  },
]

const initialClients: Client[] = [
  {
    id: "jahknowspr",
    name: "JahKnowsPR",
    businessName: "JahKnowsPR",
    email: "owner@jahknowspr.com",
    status: "active_client",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "mont-city-network",
    name: "Mont City Network",
    businessName: "Mont City Network",
    email: "studio@montcitynetwork.com",
    status: "active_client",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "arobias-unique-boutique",
    name: "Arobia's Unique Boutique",
    businessName: "Arobia's Unique Boutique",
    email: "hello@arobiasuniqueboutique.com",
    status: "active_client",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "eb-digital-magazine",
    name: "EB Digital Magazine",
    businessName: "EB Digital Magazine",
    email: "editor@ebdigitalmagazine.com",
    status: "active_client",
    createdAt: new Date(0).toISOString(),
  },
]

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: initialAgents,
  clients: initialClients,
  selectedClientId: initialClients[0].id,
  deliverables: [],

  setSelectedClient: (clientId) => set({ selectedClientId: clientId }),

  setAgentStatus: (id, status) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, status } : agent
      ),
    })),

  runAgent: (id, clientId) => {
    const { setAgentStatus, selectedClientId } = get()
    const targetClientId = clientId || selectedClientId
    
    setAgentStatus(id, "running")

    setTimeout(() => {
      const shouldSucceed = Math.random() > 0.15
      setAgentStatus(id, shouldSucceed ? "complete" : "error")
      
      if (shouldSucceed && targetClientId) {
        set((state) => ({
          deliverables: state.deliverables.map((d) =>
            d.agentId === id && d.clientId === targetClientId
              ? { ...d, status: "complete" as const, completedAt: new Date() }
              : d
          ),
          agents: state.agents.map((agent) =>
            agent.id === id ? { ...agent, lastRun: new Date() } : agent
          ),
        }))
      }
    }, 2000 + Math.random() * 3000)
  },

  resetAgent: (id) => {
    const { setAgentStatus } = get()
    setAgentStatus(id, "idle")
  },

  getAgentById: (id) => get().agents.find((agent) => agent.id === id),

  getDeliverablesByAgent: (agentId, clientId) => {
    const { deliverables, selectedClientId } = get()
    const filterClientId = clientId !== undefined ? clientId : selectedClientId
    
    return deliverables.filter((d) => 
      d.agentId === agentId && 
      (filterClientId === null || d.clientId === filterClientId)
    )
  },

  getDeliverablesByClient: (clientId) => {
    return get().deliverables.filter((d) => d.clientId === clientId)
  },
}))
