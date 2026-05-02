import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import {
  BarChart3,
  Bot,
  CheckCircle2,
  DollarSign,
  Layers,
  Megaphone,
  MousePointerClick,
  Plus,
  Target,
  Users,
} from "lucide-react"
import { ClientDropdown } from "@/components/ClientDropdown"
import { OFFICIAL_CLIENT_ID, getClientDisplayName, useClients } from "@/hooks/useClients"
import { cn } from "@/lib/utils"
import {
  campaignAnalyticsSnapshots,
  campaignPlatforms,
  campaignTrackingPlans,
  campaigns,
  channelLabels,
  getCampaignContext,
  getClientBrand,
  getClientCampaignData,
  googleAdGroups,
  googleKeywords,
  googleNegativeKeywords,
  googleSearchAds,
  googleSearchSetups,
  koraCampaignRecommendations,
  type Campaign,
  type CampaignStatus,
} from "@/lib/campaigns"

type ActiveTab = "overview" | "builder" | "analytics" | "recommendations"
type BuilderStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

const builderSteps: Array<{ step: BuilderStep; label: string; title: string }> = [
  { step: 0, label: "Client", title: "Select Client / Brand" },
  { step: 1, label: "Basics", title: "Campaign Basics" },
  { step: 2, label: "Audience", title: "Audience Pool" },
  { step: 3, label: "Content", title: "Content Selection" },
  { step: 4, label: "Offer", title: "Offer and Funnel" },
  { step: 5, label: "Platform", title: "Platform Setup" },
  { step: 6, label: "Keywords", title: "Ad Groups and Keywords" },
  { step: 7, label: "Copy", title: "Ad Copy Builder" },
  { step: 8, label: "Tracking", title: "Tracking and KORA Analytics" },
]

function formatCurrency(value: number): string {
  return value === 0 ? "$0" : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function statusTone(status: CampaignStatus): string {
  if (status === "live") return "bg-emerald-500/10 text-emerald-300"
  if (status === "testing" || status === "ready") return "bg-blue-500/10 text-blue-300"
  if (status === "paused") return "bg-amber-500/10 text-amber-300"
  return "bg-gray-700/70 text-gray-300"
}

export default function AdsCampaigns() {
  const { channel, campaignId } = useParams<{ channel?: string; campaignId?: string }>()
  const selectedChannel = channel ? channelLabels[channel] ?? "All Campaigns" : "All Campaigns"
  const { clients, getDisplayName } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview")
  const [builderStep, setBuilderStep] = useState<BuilderStep>(0)
  const [builderClientId, setBuilderClientId] = useState<string>(OFFICIAL_CLIENT_ID)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaignId || campaigns[0]?.id || "")
  const [usingPlaceholderClient, setUsingPlaceholderClient] = useState(false)

  const clientOptions = clients.length > 0 ? clients : []

  const visibleCampaigns = useMemo(() => {
    const byClient = selectedClientId ? campaigns.filter((campaign) => campaign.clientId === selectedClientId) : campaigns
    if (!channel || selectedChannel === "All Campaigns") return byClient
    return byClient.filter((campaign) => campaign.platform === selectedChannel)
  }, [channel, selectedChannel, selectedClientId])

  const effectiveSelectedCampaignId = campaignId || selectedCampaignId
  const selectedCampaign = visibleCampaigns.find((campaign) => campaign.id === effectiveSelectedCampaignId) || visibleCampaigns[0] || campaigns[0]
  const selectedContext = selectedCampaign ? getCampaignContext(selectedCampaign.id) : null
  const builderData = getClientCampaignData(builderClientId)
  const liveCount = visibleCampaigns.filter((campaign) => campaign.status === "live").length
  const testingCount = visibleCampaigns.filter((campaign) => campaign.status === "testing" || campaign.status === "ready").length
  const totalBudget = visibleCampaigns.reduce((sum, campaign) => sum + campaign.totalBudget, 0)
  const allConversions = campaignAnalyticsSnapshots
    .filter((snapshot) => !selectedClientId || snapshot.clientId === selectedClientId)
    .reduce((sum, snapshot) => sum + snapshot.conversions, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Megaphone className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">KORA Campaigns</h1>
          </div>
          <p className="text-gray-400 text-sm max-w-3xl">
            Mission Control campaign system for every client KORA manages. Select a client to review client-specific campaigns, audience pools, content, offers, funnels, analytics, and KORA recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveTab("builder")
              setBuilderStep(0)
              setBuilderClientId(selectedClientId || OFFICIAL_CLIENT_ID)
              setUsingPlaceholderClient(false)
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add New Campaign
          </button>
          <ClientDropdown
            selectedClientId={selectedClientId}
            onClientChange={(clientId) => {
              setSelectedClientId(clientId)
              if (clientId) {
                setBuilderClientId(clientId)
                setUsingPlaceholderClient(false)
              }
            }}
            allOptionLabel="All Clients"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          ["Campaigns", visibleCampaigns.length, Layers],
          ["Live", liveCount, Target],
          ["Testing", testingCount, BarChart3],
          ["Conversions", allConversions, MousePointerClick],
          ["Budget", formatCurrency(totalBudget), DollarSign],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["overview", "Campaigns Overview"],
          ["builder", "Add New Campaign"],
          ["analytics", "Campaign Analytics"],
          ["recommendations", "KORA Recommendations"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value as ActiveTab)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              activeTab === value ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <CampaignOverview
          campaigns={visibleCampaigns}
          selectedCampaign={selectedCampaign}
          selectedChannel={String(selectedChannel)}
          selectedClientId={selectedClientId}
          getClientName={(clientId) => getDisplayName(clientOptions.find((client) => client.id === clientId) || { id: clientId, business_name: clientId, first_name: null, last_name: null, email: null, client_status: null, created_at: null, telegram_id: null })}
          onSelectCampaign={setSelectedCampaignId}
        />
      )}

      {activeTab === "builder" && (
        <CampaignBuilder
          clients={clientOptions}
          builderClientId={builderClientId}
          builderData={builderData}
          builderStep={builderStep}
          usingPlaceholderClient={usingPlaceholderClient}
          onSetBuilderClient={(clientId) => {
            setBuilderClientId(clientId)
            setUsingPlaceholderClient(false)
          }}
          onUsePlaceholder={() => {
            setBuilderClientId("new-client-placeholder")
            setUsingPlaceholderClient(true)
          }}
          onSetStep={setBuilderStep}
        />
      )}

      {activeTab === "analytics" && <CampaignAnalytics selectedClientId={selectedClientId} selectedCampaign={selectedCampaign} />}

      {activeTab === "recommendations" && <CampaignRecommendations selectedClientId={selectedClientId} />}

      {selectedContext && activeTab !== "builder" && <CampaignDetail context={selectedContext} />}
    </div>
  )
}

function CampaignOverview({
  campaigns: visibleCampaigns,
  selectedCampaign,
  selectedChannel,
  selectedClientId,
  getClientName,
  onSelectCampaign,
}: {
  campaigns: Campaign[]
  selectedCampaign?: Campaign
  selectedChannel: string
  selectedClientId: string | null
  getClientName: (clientId: string) => string
  onSelectCampaign: (campaignId: string) => void
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h2 className="font-semibold text-white">{selectedChannel}</h2>
        <p className="text-xs text-gray-500 mt-1">
          {selectedClientId ? `${getClientName(selectedClientId)} campaign performance and strategy context.` : "Global Mission Control view across all KORA clients."}
        </p>
      </div>
      {visibleCampaigns.length === 0 ? (
        <div className="p-8 text-center">
          <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No campaigns yet</p>
          <p className="text-sm text-gray-500 mt-1">Create a campaign after selecting the client and audience pool.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Campaign</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Platform</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Offer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visibleCampaigns.map((campaign) => {
              const context = getCampaignContext(campaign.id)
              return (
                <tr
                  key={campaign.id}
                  onClick={() => onSelectCampaign(campaign.id)}
                  className={cn("hover:bg-white/5 transition-colors cursor-pointer", selectedCampaign?.id === campaign.id && "bg-blue-500/5")}
                >
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{campaign.name}</p>
                    <span className={cn("inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px]", statusTone(campaign.status))}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{getClientName(campaign.clientId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{campaign.platform}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{context?.offer?.name || "No offer selected"}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatCurrency(campaign.totalBudget)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function CampaignBuilder({
  clients,
  builderClientId,
  builderData,
  builderStep,
  usingPlaceholderClient,
  onSetBuilderClient,
  onUsePlaceholder,
  onSetStep,
}: {
  clients: ReturnType<typeof useClients>["clients"]
  builderClientId: string
  builderData: ReturnType<typeof getClientCampaignData>
  builderStep: BuilderStep
  usingPlaceholderClient: boolean
  onSetBuilderClient: (clientId: string) => void
  onUsePlaceholder: () => void
  onSetStep: (step: BuilderStep) => void
}) {
  const firstAudience = builderData.audiencePools[0]
  const firstContent = builderData.content[0]
  const firstOffer = builderData.offers[0]
  const firstFunnel = builderData.funnels[0]
  const firstCampaign = builderData.campaigns[0]
  const googleSetup = firstCampaign ? googleSearchSetups.find((setup) => setup.campaignId === firstCampaign.id) : null
  const adGroups = firstCampaign ? googleAdGroups.filter((group) => group.campaignId === firstCampaign.id) : []
  const ads = firstCampaign ? googleSearchAds.filter((ad) => ad.campaignId === firstCampaign.id) : []
  const trackingPlan = firstCampaign ? campaignTrackingPlans.find((plan) => plan.campaignId === firstCampaign.id) : null

  return (
    <div className="grid lg:grid-cols-[240px,1fr] gap-4">
      <div className="bg-gray-800/50 rounded-xl border border-white/5 p-3 h-fit">
        {builderSteps.map((item) => (
          <button
            key={item.step}
            onClick={() => onSetStep(item.step)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
              builderStep === item.step ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">{item.step}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 p-5 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-300">Step {builderStep}</p>
          <h2 className="text-xl font-semibold text-white">{builderSteps.find((item) => item.step === builderStep)?.title}</h2>
        </div>

        {builderStep === 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <p className="text-white font-medium">Which client is this campaign for?</p>
              <p className="text-sm text-blue-100/80 mt-1">Select an existing client or create a placeholder so the campaign can inherit that client's brand, audiences, content, offers, and funnels.</p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              {clients.map((client) => {
                const data = getClientCampaignData(client.id)
                const isSelected = builderClientId === client.id && !usingPlaceholderClient
                return (
                  <button
                    key={client.id}
                    onClick={() => onSetBuilderClient(client.id)}
                    className={cn("text-left rounded-xl border p-4 transition-colors", isSelected ? "border-blue-400 bg-blue-500/10" : "border-white/10 bg-gray-900/60 hover:border-white/20")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white">{getClientDisplayName(client)}</h3>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-300" />}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{client.brand_type || data.brand?.brandType || "Client brand"}</p>
                    <dl className="mt-3 space-y-1 text-xs text-gray-400">
                      <div>Industry: {client.industry || data.brand?.industry || "Not set"}</div>
                      <div>Main offer: {client.main_offer || data.offers[0]?.name || "Not set"}</div>
                      <div>Website: {client.website || data.brand?.website || "Not set"}</div>
                      <div>Campaigns: {data.campaigns.length}</div>
                      <div>Audience pools: {data.audiencePools.length}</div>
                      <div>Funnels: {data.funnels.length}</div>
                      <div>Last KORA report: {client.last_kora_report_at || "Not generated"}</div>
                    </dl>
                  </button>
                )
              })}
              <button
                onClick={onUsePlaceholder}
                className={cn("text-left rounded-xl border p-4 transition-colors", usingPlaceholderClient ? "border-amber-400 bg-amber-500/10" : "border-dashed border-white/15 bg-gray-900/40 hover:border-white/25")}
              >
                <Plus className="h-5 w-5 text-amber-300 mb-2" />
                <h3 className="font-semibold text-white">Create New Client Placeholder</h3>
                <p className="text-xs text-gray-400 mt-1">Use when the brand is not fully onboarded yet. The campaign remains client-scoped from the first step.</p>
              </button>
            </div>
          </div>
        )}

        {builderStep === 1 && (
          <InfoGrid
            items={[
              ["client_id", builderClientId],
              ["brand_id", builderData.brand?.id || "new-brand-placeholder"],
              ["Campaign name", firstCampaign?.name || "New client campaign"],
              ["Objective", firstCampaign?.objective || "lead_generation"],
              ["Platform", firstCampaign?.platform || "Google Search"],
              ["Campaign type", firstCampaign?.campaignType || "search"],
              ["Status", firstCampaign?.status || "draft"],
              ["Owner", firstCampaign?.owner || "KORA"],
              ["Daily budget", firstCampaign ? formatCurrency(firstCampaign.dailyBudget) : "Set during planning"],
              ["Total budget", firstCampaign ? formatCurrency(firstCampaign.totalBudget) : "Set during planning"],
              ["Notes", firstCampaign?.notes || "Campaign basics inherit the selected client's context."],
            ]}
          />
        )}

        {builderStep === 2 && (
          <SectionList
            question="Which audience pool is this campaign for?"
            empty="No audience pools for this client yet. Build New Audience for this client."
            items={builderData.audiencePools.map((pool) => ({
              title: pool.name,
              meta: `${pool.problemAwarenessLevel} - ${pool.industry}`,
              body: `${pool.description} Desired outcome: ${pool.desiredOutcome}`,
              tags: pool.keywordsThemes,
            }))}
            footer={firstAudience ? `Build new audience fields include pain points, objections, search intent, tone, keywords, and offer fit for ${firstAudience.industry}.` : "Build New Audience saves the pool to the selected client only."}
          />
        )}

        {builderStep === 3 && (
          <SectionList
            question="Which content will warm this audience up?"
            empty="No content for this client yet. Add a manual content item or future content idea."
            items={builderData.content.map((content) => ({
              title: content.title,
              meta: `${content.contentType} - ${content.status}`,
              body: `${content.funnelFit}. CTA: ${content.cta}. KORA: ${content.koraRecommendation}`,
              tags: [content.category, content.seoKeyword || "No SEO keyword"].filter(Boolean),
            }))}
            footer={firstContent ? `Selected content keeps client_id=${firstContent.clientId} and related offer ${firstContent.relatedOfferId || "not set"}.` : "Content can be existing, manual, or future idea."}
          />
        )}

        {builderStep === 4 && (
          <div className="grid md:grid-cols-2 gap-4">
            <EntityCard
              title="What offer should this campaign lead to?"
              value={firstOffer?.name || "No offer selected"}
              rows={[
                ["Offer type", firstOffer?.offerType || "Not set"],
                ["Price", firstOffer?.price != null ? formatCurrency(firstOffer.price) : "Not set"],
                ["URL", firstOffer?.url || "Not set"],
                ["Primary CTA", firstOffer?.primaryCta || "Not set"],
                ["Conversion event", firstOffer?.conversionEvent || "Not set"],
              ]}
            />
            <EntityCard
              title="Client-specific funnel"
              value={firstFunnel?.name || "No funnel selected"}
              rows={[
                ["Entry source", firstFunnel?.entrySource || "Not set"],
                ["Content page", firstFunnel?.contentPage || "Not set"],
                ["Offer page", firstFunnel?.offerPage || "Not set"],
                ["Form/booking/checkout", firstFunnel?.formBookingCheckoutStep || "Not set"],
                ["Follow-up", firstFunnel?.followUpAction || "Not set"],
              ]}
            />
          </div>
        )}

        {builderStep === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">Focus path: Google Search first. The campaign model remains platform-flexible for {campaignPlatforms.join(", ")}.</p>
            <InfoGrid
              items={[
                ["client_id", googleSetup?.clientId || builderClientId],
                ["campaign_id", googleSetup?.campaignId || "new-campaign-id"],
                ["Google Ads campaign name", googleSetup?.googleAdsCampaignName || "New Google Search Campaign"],
                ["Objective", googleSetup?.objective || "lead_generation"],
                ["Location targeting", googleSetup?.locationTargeting || "Set by client market"],
                ["Language", googleSetup?.language || "English"],
                ["Daily budget", googleSetup ? formatCurrency(googleSetup.dailyBudget) : "Set during basics"],
                ["Bidding strategy", googleSetup?.biddingStrategy || "Maximize conversions"],
                ["Final URL", googleSetup?.finalUrl || firstOffer?.url || "Not set"],
                ["UTM source", googleSetup?.utmSource || "google"],
                ["UTM medium", googleSetup?.utmMedium || "cpc"],
                ["UTM campaign", googleSetup?.utmCampaign || "{client_slug}_{campaign_slug}"],
                ["UTM content", googleSetup?.utmContent || "{ad_group_slug}"],
                ["UTM term", googleSetup?.utmTerm || "{keyword}"],
              ]}
            />
          </div>
        )}

        {builderStep === 6 && (
          <SectionList
            question="Ad groups and keywords"
            empty="No ad groups generated yet."
            items={adGroups.map((group) => ({
              title: group.name,
              meta: `${group.problemAngle} - ${group.status}`,
              body: `Landing page: ${group.landingPage}. CTA: ${group.cta}. Negative keywords: ${group.negativeKeywordList.join(", ") || "None"}.`,
              tags: googleKeywords.filter((keyword) => keyword.adGroupId === group.id).map((keyword) => `${keyword.keyword} (${keyword.matchType})`),
            }))}
            footer={`Negative keywords: ${googleNegativeKeywords.filter((keyword) => keyword.clientId === builderClientId).map((keyword) => keyword.keyword).join(", ") || "None yet"}`}
          />
        )}

        {builderStep === 7 && (
          <SectionList
            question="Ad copy adapts to the selected client's brand voice"
            empty="No ad copy generated yet."
            items={ads.map((ad) => ({
              title: `${ad.headline1} | ${ad.headline2}`,
              meta: ad.brandVoiceNote,
              body: `${ad.description1} ${ad.description2}`,
              tags: [ad.headline3, ad.cta, ad.displayPath],
            }))}
            footer="JahKnowsPR uses direct strategy language, Mont City uses media/storytelling language, and service clients use their own brand voice."
          />
        )}

        {builderStep === 8 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">Every event in the tracking plan carries client_id, brand_id, campaign_id, and available audience_pool_id, content_id, offer_id, and funnel_id.</p>
            <div className="grid md:grid-cols-3 gap-3">
              {(trackingPlan?.trackedEvents || []).map((event) => (
                <div key={event} className="rounded-lg border border-white/5 bg-gray-900/50 px-3 py-2 text-sm text-gray-300">{event}</div>
              ))}
            </div>
            <InfoGrid
              items={[
                ["Analytics views", trackingPlan?.analyticsViews.join(", ") || "Client, campaign detail, global Mission Control"],
                ["client_id", trackingPlan?.clientId || builderClientId],
                ["brand_id", trackingPlan?.brandId || builderData.brand?.id || "new-brand-placeholder"],
                ["audience_pool_id", trackingPlan?.audiencePoolId || "selected audience pool"],
                ["content_id", trackingPlan?.contentId || "selected content"],
                ["offer_id", trackingPlan?.offerId || "selected offer"],
                ["funnel_id", trackingPlan?.funnelId || "selected funnel"],
              ]}
            />
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-white/5">
          <button
            onClick={() => onSetStep(Math.max(0, builderStep - 1) as BuilderStep)}
            disabled={builderStep === 0}
            className="px-3 py-1.5 rounded-lg bg-gray-700 text-sm text-white disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => onSetStep(Math.min(8, builderStep + 1) as BuilderStep)}
            disabled={builderStep === 8}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-sm text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function CampaignDetail({ context }: { context: NonNullable<ReturnType<typeof getCampaignContext>> }) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-xl border border-white/5 bg-gray-800/50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Campaign Detail</p>
            <h2 className="text-xl font-semibold text-white">{context.campaign.name}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {context.brand?.name} - {context.brand?.industry}
            </p>
          </div>
          <span className={cn("px-2 py-1 rounded-full text-xs", statusTone(context.campaign.status))}>{context.campaign.status}</span>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-5">
          <EntityCard
            title="Strategy Context"
            value={context.audiencePool?.name || "No audience selected"}
            rows={[
              ["Pain angle", context.audiencePool?.mainPainPoints[0] || "Not set"],
              ["Offer", context.offer?.name || "Not set"],
              ["Funnel", context.funnel?.name || "Not set"],
              ["Brand voice", context.brand?.voiceNote || "Not set"],
            ]}
          />
          <EntityCard
            title="Performance Snapshot"
            value={context.analytics?.dateRange || "No analytics yet"}
            rows={[
              ["Impressions", context.analytics?.impressions.toLocaleString() || "0"],
              ["Clicks", context.analytics?.clicks.toLocaleString() || "0"],
              ["Conversions", context.analytics?.conversions.toLocaleString() || "0"],
              ["Spend", context.analytics ? formatCurrency(context.analytics.spend) : "$0"],
            ]}
          />
        </div>
      </div>
      <div className="rounded-xl border border-white/5 bg-gray-800/50 p-5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-300" />
          KORA Recommendations
        </h3>
        <div className="space-y-3 mt-4">
          {context.recommendations.map((recommendation) => (
            <div key={recommendation.id} className="rounded-lg bg-gray-900/60 border border-white/5 p-3">
              <p className="text-sm font-medium text-white">{recommendation.title}</p>
              <p className="text-xs text-gray-400 mt-1">{recommendation.recommendation}</p>
            </div>
          ))}
          {context.recommendations.length === 0 && <p className="text-sm text-gray-400">No recommendations yet.</p>}
        </div>
      </div>
    </div>
  )
}

function CampaignAnalytics({ selectedClientId, selectedCampaign }: { selectedClientId: string | null; selectedCampaign?: Campaign }) {
  const snapshots = campaignAnalyticsSnapshots.filter((snapshot) => !selectedClientId || snapshot.clientId === selectedClientId)
  const campaignSnapshot = selectedCampaign ? campaignAnalyticsSnapshots.find((snapshot) => snapshot.campaignId === selectedCampaign.id) : null
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <EntityCard
        title="Client Campaign Analytics"
        value={selectedClientId ? getClientBrand(selectedClientId)?.name || selectedClientId : "All clients"}
        rows={[
          ["Campaigns", snapshots.length],
          ["Clicks", snapshots.reduce((sum, snapshot) => sum + snapshot.clicks, 0).toLocaleString()],
          ["Conversions", snapshots.reduce((sum, snapshot) => sum + snapshot.conversions, 0).toLocaleString()],
          ["Spend", formatCurrency(snapshots.reduce((sum, snapshot) => sum + snapshot.spend, 0))],
        ]}
      />
      <EntityCard
        title="Campaign Detail Analytics"
        value={selectedCampaign?.name || "No campaign selected"}
        rows={[
          ["Date range", campaignSnapshot?.dateRange || "Not available"],
          ["Content views", campaignSnapshot?.contentViews.toLocaleString() || "0"],
          ["CTA clicks", campaignSnapshot?.ctaClicks.toLocaleString() || "0"],
          ["KORA recommendations", campaignSnapshot?.recommendationCount || 0],
        ]}
      />
      <EntityCard
        title="Global Mission Control Analytics"
        value="Cross-client oversight"
        rows={[
          ["All clients", new Set(campaigns.map((campaign) => campaign.clientId)).size],
          ["Total campaigns", campaigns.length],
          ["Cross-client findings", koraCampaignRecommendations.filter((rec) => rec.clientId === "global").length],
          ["Tracked plans", campaignTrackingPlans.length],
        ]}
      />
    </div>
  )
}

function CampaignRecommendations({ selectedClientId }: { selectedClientId: string | null }) {
  const recommendations = koraCampaignRecommendations.filter((rec) => rec.clientId === "global" || !selectedClientId || rec.clientId === selectedClientId)
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {recommendations.map((recommendation) => (
        <div key={recommendation.id} className="rounded-xl border border-white/5 bg-gray-800/50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{recommendation.findingType}</p>
              <h3 className="font-semibold text-white mt-1">{recommendation.title}</h3>
            </div>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">{recommendation.priority}</span>
          </div>
          <p className="text-sm text-gray-300 mt-3">{recommendation.summary}</p>
          <p className="text-xs text-gray-500 mt-2">Evidence: {recommendation.evidence}</p>
          <div className="mt-3 rounded-lg bg-gray-900/60 border border-white/5 p-3 text-sm text-gray-300">
            {recommendation.recommendation}
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionList({
  question,
  empty,
  items,
  footer,
}: {
  question: string
  empty: string
  items: Array<{ title: string; meta: string; body: string; tags: string[] }>
  footer?: string
}) {
  return (
    <div className="space-y-3">
      <p className="text-white font-medium">{question}</p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-white/5 bg-gray-900/50 p-4 text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-xl border border-white/5 bg-gray-900/50 p-4">
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="text-xs text-blue-300 mt-1">{item.meta}</p>
              <p className="text-sm text-gray-400 mt-3">{item.body}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {item.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="rounded bg-gray-700/70 px-2 py-0.5 text-[11px] text-gray-300">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {footer && <p className="text-xs text-gray-500">{footer}</p>}
    </div>
  )
}

function EntityCard({ title, value, rows }: { title: string; value: string; rows: Array<[string, string | number]> }) {
  return (
    <div className="rounded-xl border border-white/5 bg-gray-900/50 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <h3 className="font-semibold text-white mt-1">{value}</h3>
      <dl className="mt-4 space-y-2">
        {rows.map(([label, rowValue]) => (
          <div key={label} className="flex gap-3 justify-between text-sm">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-300 text-right max-w-[60%]">{rowValue}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function InfoGrid({ items }: { items: Array<[string, string | number]> }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-white/5 bg-gray-900/50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-sm text-gray-200 mt-1 break-words">{value}</p>
        </div>
      ))}
    </div>
  )
}
