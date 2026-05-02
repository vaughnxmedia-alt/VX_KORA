import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientDropdown } from "@/components/ClientDropdown";
import { OFFICIAL_CLIENT_ID, useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";

type WithMetadata = {
  metadata?: Record<string, unknown> | null;
  brand_id?: string | null;
  site_id?: string | null;
  user_id?: string | null;
};

const SITE_ID = "jahknowspr_web";
const BRAND_ID = "jahknowspr";

function extractClientHint(row: WithMetadata): string[] {
  const metadata = row.metadata || {};
  const maybe = [
    row.brand_id,
    row.site_id,
    row.user_id,
    (metadata.client_id as string | undefined) ?? null,
    (metadata.customer_id as string | undefined) ?? null,
    (metadata.tenant_id as string | undefined) ?? null,
    (metadata.clientId as string | undefined) ?? null,
    (metadata.customerId as string | undefined) ?? null,
    (metadata.tenantId as string | undefined) ?? null,
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((v) => v.toLowerCase());
  return maybe;
}

function rowMatchesClient(row: WithMetadata, clientId: string): boolean {
  const hints = extractClientHint(row);
  const needle = clientId.toLowerCase();
  return hints.some((hint) => hint.includes(needle));
}

export default function AnalyticsInsights() {
  const { clients, getDisplayName } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(OFFICIAL_CLIENT_ID);
  const [events, setEvents] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [rollups, setRollups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const selectedClient = selectedClientId ? clients.find((c) => c.id === selectedClientId) : null;

  const setSelectedClient = (clientId: string | null) => {
    setSelectedClientId(clientId);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [eventsRes, findingsRes, rollupsRes] = await Promise.all([
          supabase
            .from("analytics_events")
            .select("created_at,event_name,page_path,funnel_id,funnel_step,offer_id,revenue_value,brand_id,site_id,user_id,metadata")
            .eq("site_id", SITE_ID)
            .eq("brand_id", BRAND_ID)
            .order("created_at", { ascending: false })
            .limit(300),
          supabase
            .from("kora_analytics_findings")
            .select("*")
            .eq("site_id", SITE_ID)
            .eq("brand_id", BRAND_ID)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("analytics_daily_rollups")
            .select("*")
            .eq("site_id", SITE_ID)
            .eq("brand_id", BRAND_ID)
            .order("date", { ascending: false })
            .limit(14),
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (findingsRes.error) throw findingsRes.error;
        if (rollupsRes.error) throw rollupsRes.error;

        if (!cancelled) {
          setEvents(eventsRes.data || []);
          setFindings(findingsRes.data || []);
          setRollups(rollupsRes.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load analytics data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (!selectedClientId) return [];
    return events.filter((row) => rowMatchesClient(row as WithMetadata, selectedClientId));
  }, [events, selectedClientId]);

  const filteredFindings = useMemo(() => {
    if (!selectedClientId) return [];
    return findings.filter((row) => rowMatchesClient(row as WithMetadata, selectedClientId));
  }, [findings, selectedClientId]);

  const filteredRollups = useMemo(() => {
    if (!selectedClientId) return [];
    return rollups.filter((row) => rowMatchesClient(row as WithMetadata, selectedClientId));
  }, [rollups, selectedClientId]);

  const pageViews = filteredRollups.reduce((sum, row) => sum + Number(row.page_views || 0), 0);
  const sessions = filteredRollups.reduce((sum, row) => sum + Number(row.sessions || 0), 0);
  const revenue = filteredRollups.reduce((sum, row) => sum + Number(row.revenue || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Analytics Intelligence</h1>
          <p className="text-gray-400 mt-1">
            JahKnowsPR analytics reviewed inside Mission Control.
          </p>
        </div>
        <ClientDropdown
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClient}
          showAllOption={false}
          className="min-w-[280px]"
        />
      </div>

      {loading && <p className="text-sm text-gray-400">Loading analytics data...</p>}
      {loadError && <p className="text-sm text-red-400">Could not load analytics data: {loadError}</p>}

      {!selectedClientId ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
          <p className="text-sm text-gray-300 mb-4">Open the JahKnowsPR analytics dashboard.</p>
          <div className="flex flex-wrap gap-2">
            {clients.map((client) => (
              <Button key={client.id} variant="outline" onClick={() => setSelectedClient(client.id)}>
                {getDisplayName(client)}
              </Button>
            ))}
            {clients.length === 0 && <p className="text-sm text-gray-400">No KORA client configured yet.</p>}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedClient ? `${getDisplayName(selectedClient)} — Analytics Dashboard` : "Client Analytics Dashboard"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Client ID: {selectedClientId}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <div className="text-sm text-gray-400">Recent events</div>
              <div className="text-2xl font-semibold text-white">{filteredEvents.length}</div>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <div className="text-sm text-gray-400">Daily rollups</div>
              <div className="text-2xl font-semibold text-white">{filteredRollups.length}</div>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <div className="text-sm text-gray-400">KORA findings</div>
              <div className="text-2xl font-semibold text-white">{filteredFindings.length}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <div className="text-sm text-gray-400">Page views</div>
              <div className="text-2xl font-semibold text-white">{pageViews.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <div className="text-sm text-gray-400">Sessions</div>
              <div className="text-2xl font-semibold text-white">{sessions.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <div className="text-sm text-gray-400">Revenue</div>
              <div className="text-2xl font-semibold text-white">${revenue.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-700 bg-gray-800/50">
              <div className="p-4 border-b border-gray-700">
                <h2 className="font-medium text-white">Latest Findings</h2>
              </div>
              <div className="divide-y divide-gray-700 max-h-[420px] overflow-y-auto">
                {filteredFindings.map((f) => (
                  <div key={f.id} className="p-4 text-sm">
                    <div className="text-white font-medium">{f.title}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">
                      {f.priority} · {f.finding_type} · {f.status}
                    </div>
                    <p className="text-gray-300 mt-2">{f.summary}</p>
                    <p className="text-gray-400 mt-1">Recommendation: {f.recommendation}</p>
                  </div>
                ))}
                {!filteredFindings.length && (
                  <p className="p-4 text-sm text-gray-400">
                    No client-specific findings yet. Add `metadata.client_id` when tracking events to power per-client reporting.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-800/50">
              <div className="p-4 border-b border-gray-700">
                <h2 className="font-medium text-white">Recent Events Feed</h2>
              </div>
              <div className="divide-y divide-gray-700 max-h-[420px] overflow-y-auto">
                {filteredEvents.map((event, idx) => (
                  <div key={`${event.created_at}_${idx}`} className="p-4 text-sm">
                    <div className="text-white">{event.event_name}</div>
                    <div className="text-xs text-gray-400">
                      {event.page_path || "(unknown page)"} · Funnel {event.funnel_id || "—"} / {event.funnel_step || "—"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.created_at).toLocaleString()} · Revenue {Number(event.revenue_value || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
                {!filteredEvents.length && (
                  <p className="p-4 text-sm text-gray-400">
                    No client-specific events yet. Add `metadata.client_id` to event payloads for precise client dashboards.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
