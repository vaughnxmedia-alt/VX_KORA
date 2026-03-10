import { useState, useEffect } from "react"

export interface Client {
  id: string
  business_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  client_status: string | null
  created_at: string | null
}

const MOCK_CLIENTS: Client[] = [
  { id: "jahknowspr", business_name: "JahKnowsPR", first_name: "Jah", last_name: null, email: "jah@jahknowspr.com", client_status: "active", created_at: "2024-01-01" },
  { id: "techflow", business_name: "TechFlow Solutions", first_name: null, last_name: null, email: "contact@techflow.io", client_status: "active", created_at: "2024-02-15" },
  { id: "meridian", business_name: "Meridian Capital", first_name: null, last_name: null, email: "info@meridiancap.com", client_status: "active", created_at: "2024-02-20" },
  { id: "financehub", business_name: "FinanceHub Inc", first_name: null, last_name: null, email: "hello@financehub.com", client_status: "active", created_at: "2024-03-01" },
  { id: "dataviz", business_name: "DataViz Analytics", first_name: null, last_name: null, email: "team@dataviz.co", client_status: "active", created_at: "2024-03-05" },
  { id: "acme", business_name: "Acme Corp", first_name: null, last_name: null, email: "info@acme.com", client_status: "inactive", created_at: "2024-01-10" },
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
}

export function useClients(): UseClientsResult {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS)
  const [loading, setLoading] = useState(false)
  const [error] = useState<string | null>(null)

  useEffect(() => {
    setLoading(false)
    setClients(MOCK_CLIENTS)
  }, [])

  const getClientById = (id: string): Client | undefined => {
    return clients.find(c => c.id === id)
  }

  return {
    clients,
    loading,
    error,
    getDisplayName: getClientDisplayName,
    getClientById
  }
}
