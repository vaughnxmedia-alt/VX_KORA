import { useState, useEffect, useCallback } from "react"
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
}

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
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
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
      setClients([])
    } else {
      setClients((data || []) as Client[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
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
