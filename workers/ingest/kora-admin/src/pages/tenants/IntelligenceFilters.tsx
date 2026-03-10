import { useState } from "react"
import { 
  Filter, Plus, MoreHorizontal, CheckCircle2, Settings, Building2,
  Tag, XCircle, Globe, Users, Sparkles, FileText, ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterProfile {
  id: string
  tenant: string
  name: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  includeTopics: string[]
  excludeTopics: string[]
  preferredSourceTypes: string[]
  platformFocus: string[]
  summaryStyle: "brief" | "detailed" | "executive"
  strategyStyle: "actionable" | "analytical" | "creative"
  allowAutoRouteToRag: boolean
  allowMakeMeSmarter: boolean
  parsingDepth: "shallow" | "medium" | "deep"
  createdAt: string
  updatedAt: string
}

const mockProfiles: FilterProfile[] = [
  {
    id: "1", tenant: "JahKnowsPR", name: "JahKnowsPR Home Profile",
    description: "Default intelligence filter profile optimized for PR, marketing, and creator economy insights",
    isDefault: true, isActive: true,
    includeTopics: ["creators", "influencers", "viral marketing", "brand controversies", "PR crises", "creator economy", "social media trends"],
    excludeTopics: ["corporate earnings", "internal agency hires", "boring acquisitions", "unrelated finance news"],
    preferredSourceTypes: ["rss", "youtube", "social", "web"],
    platformFocus: ["Instagram", "TikTok", "YouTube", "LinkedIn", "X"],
    summaryStyle: "executive", strategyStyle: "actionable",
    allowAutoRouteToRag: true, allowMakeMeSmarter: true, parsingDepth: "deep",
    createdAt: "Jan 15, 2024", updatedAt: "Mar 1, 2024"
  },
  {
    id: "2", tenant: "Acme Corp", name: "Default Profile",
    description: "Standard technology industry filtering",
    isDefault: true, isActive: true,
    includeTopics: ["technology", "SaaS", "enterprise software", "cloud computing", "AI"],
    excludeTopics: ["consumer tech", "gaming", "social media drama"],
    preferredSourceTypes: ["rss", "web"],
    platformFocus: ["LinkedIn", "Twitter"],
    summaryStyle: "detailed", strategyStyle: "analytical",
    allowAutoRouteToRag: false, allowMakeMeSmarter: false, parsingDepth: "medium",
    createdAt: "Feb 20, 2024", updatedAt: "Feb 20, 2024"
  },
  {
    id: "3", tenant: "Brand Agency", name: "Agency Profile",
    description: "Multi-client agency filtering for brand marketing",
    isDefault: true, isActive: true,
    includeTopics: ["brand marketing", "advertising", "campaigns", "creative", "brand strategy"],
    excludeTopics: ["B2B", "enterprise", "technical"],
    preferredSourceTypes: ["rss", "youtube", "social"],
    platformFocus: ["Instagram", "TikTok", "YouTube"],
    summaryStyle: "brief", strategyStyle: "creative",
    allowAutoRouteToRag: true, allowMakeMeSmarter: true, parsingDepth: "medium",
    createdAt: "Feb 10, 2024", updatedAt: "Feb 28, 2024"
  },
]

const styleLabels = {
  summaryStyle: { brief: "Brief", detailed: "Detailed", executive: "Executive" },
  strategyStyle: { actionable: "Actionable", analytical: "Analytical", creative: "Creative" },
  parsingDepth: { shallow: "Shallow", medium: "Medium", deep: "Deep" },
}

export default function IntelligenceFilters() {
  const [profiles] = useState<FilterProfile[]>(mockProfiles)
  const [selectedProfile, setSelectedProfile] = useState<FilterProfile | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Intelligence Filters</h1>
          <p className="text-gray-400 text-sm">Manage how KORA searches, filters, and prioritizes data for each tenant</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Create Profile
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Profiles</p>
          <p className="text-2xl font-bold text-white">{profiles.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{profiles.filter(p => p.isActive).length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Make Me Smarter Enabled</p>
          <p className="text-2xl font-bold text-purple-400">{profiles.filter(p => p.allowMakeMeSmarter).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Profiles List */}
        <div className="col-span-1 space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className={cn(
                "bg-gray-800/50 rounded-xl p-4 border cursor-pointer transition-all",
                selectedProfile?.id === profile.id
                  ? "border-blue-500 bg-blue-500/5"
                  : "border-white/5 hover:border-white/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {profile.isDefault && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Default</span>
                  )}
                  {profile.isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </div>
              <h3 className="text-white font-medium mb-1">{profile.name}</h3>
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {profile.tenant}
              </p>
            </div>
          ))}
        </div>

        {/* Profile Detail */}
        <div className="col-span-2">
          {selectedProfile ? (
            <div className="bg-gray-800/50 rounded-xl border border-white/5 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white">{selectedProfile.name}</h2>
                    {selectedProfile.isDefault && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Default</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{selectedProfile.description}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Last updated: {selectedProfile.updatedAt}
                  </p>
                </div>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Include Topics */}
                <div>
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-emerald-400" />
                    Include Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.includeTopics.map((topic, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Exclude Topics */}
                <div>
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    Exclude Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.excludeTopics.map((topic, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-400/10 text-red-400">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Source Types and Platforms */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" />
                      Preferred Source Types
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.preferredSourceTypes.map((type, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-400/10 text-blue-400 capitalize">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-purple-400" />
                      Platform Focus
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.platformFocus.map((platform, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-400/10 text-purple-400">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Summary Style</p>
                    <p className="text-white font-medium">{styleLabels.summaryStyle[selectedProfile.summaryStyle]}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Strategy Style</p>
                    <p className="text-white font-medium">{styleLabels.strategyStyle[selectedProfile.strategyStyle]}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Parsing Depth</p>
                    <p className="text-white font-medium">{styleLabels.parsingDepth[selectedProfile.parsingDepth]}</p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {selectedProfile.allowAutoRouteToRag ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-300">Auto Route to RAG</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedProfile.allowMakeMeSmarter ? (
                      <Sparkles className="h-4 w-4 text-purple-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-300">Make Me Smarter</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-xl border border-white/5 p-12 flex flex-col items-center justify-center">
              <Filter className="h-12 w-12 text-gray-600 mb-4" />
              <p className="text-gray-400">Select a filter profile to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
