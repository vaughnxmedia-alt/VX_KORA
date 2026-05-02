import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export interface Client {
  id: string
  business_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  client_status: string | null
  created_at: string | null
  telegram_id: number | null
  brand_type?: string | null
  industry?: string | null
  main_offer?: string | null
  website?: string | null
  campaign_count?: number
  audience_pool_count?: number
  funnel_count?: number
  last_kora_report_at?: string | null
}

export const OFFICIAL_CLIENT_ID = "jahknowspr"

export const OFFICIAL_CLIENT: Client = {
  id: OFFICIAL_CLIENT_ID,
  business_name: "JahKnowsPR",
  first_name: null,
  last_name: null,
  email: "owner@jahknowspr.com",
  client_status: "active",
  created_at: null,
  telegram_id: null,
  brand_type: "Strategy and PR firm",
  industry: "Brand strategy, PR, content intelligence",
  main_offer: "Free Audit Diagnosis",
  website: "https://jahknowspr.com",
  campaign_count: 1,
  audience_pool_count: 4,
  funnel_count: 3,
  last_kora_report_at: "2026-04-26",
}

export const SEEDED_CLIENTS: Client[] = [
  OFFICIAL_CLIENT,
  {
    id: "mont-city-network",
    business_name: "Mont City Network",
    first_name: null,
    last_name: null,
    email: "studio@montcitynetwork.com",
    client_status: "active",
    created_at: null,
    telegram_id: null,
    brand_type: "Media network",
    industry: "Local media, sports, culture",
    main_offer: "Watch Trailer or Join Newsletter",
    website: "https://montcitynetwork.com",
    campaign_count: 1,
    audience_pool_count: 4,
    funnel_count: 4,
    last_kora_report_at: "2026-04-24",
  },
  {
    id: "arobias-unique-boutique",
    business_name: "Arobia's Unique Boutique",
    first_name: null,
    last_name: null,
    email: "hello@arobiasuniqueboutique.com",
    client_status: "active",
    created_at: null,
    telegram_id: null,
    brand_type: "Service business",
    industry: "Luxury hair and wig services",
    main_offer: "Book Consultation",
    website: "https://arobiasuniqueboutique.com",
    campaign_count: 1,
    audience_pool_count: 3,
    funnel_count: 2,
    last_kora_report_at: "2026-04-20",
  },
  {
    id: "eb-digital-magazine",
    business_name: "EB Digital Magazine",
    first_name: null,
    last_name: null,
    email: "editor@ebdigitalmagazine.com",
    client_status: "active",
    created_at: null,
    telegram_id: null,
    brand_type: "Digital publication",
    industry: "Lifestyle, luxury, creative culture",
    main_offer: "Subscribe or Read Feature",
    website: "https://ebdigitalmagazine.com",
    campaign_count: 1,
    audience_pool_count: 1,
    funnel_count: 2,
    last_kora_report_at: "2026-04-18",
  },
]

export function getClientDisplayName(client: Client): string {
  if (client.business_name) return client.business_name
  if (client.first_name || client.last_name) {
    return `${client.first_name || ""} ${client.last_name || ""}`.trim()
  }
  return client.email || "Unknown Client"
}

interface UseClientsResult {
  clients: Client[]
  loading: boolean
  error: string | null
  getDisplayName: (client: Client) => string
  getClientById: (id: string) => Client | undefined
  refetch: () => Promise<void>
}

export function useClients(): UseClientsResult {
  const [clients, setClients] = useState<Client[]>(SEEDED_CLIENTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: supaError } = await supabase
      .from("customers")
      .select("id, business_name, first_name, last_name, email, client_status, created_at, telegram_id")
      .order("created_at", { ascending: false })

    if (supaError) {
      setError(supaError.message)
      setClients(SEEDED_CLIENTS)
      setLoading(false)
      return
    }

    const seededIds = new Set(SEEDED_CLIENTS.map((client) => client.id))
    const customerClients = ((data || []) as Client[]).filter((client) => !seededIds.has(client.id))
    setClients([...SEEDED_CLIENTS, ...customerClients])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchClients()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [fetchClients])

  const getClientById = (id: string) => clients.find((c) => c.id === id)

  return {
    clients,
    loading,
    error,
    getDisplayName: getClientDisplayName,
    getClientById,
    refetch: fetchClients,
  }
}
