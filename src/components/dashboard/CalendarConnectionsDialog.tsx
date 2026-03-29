/**
 * Calendar / integration connections: per-provider API key entry (encrypted server-side).
 */

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import {
  SOCIAL_INTEGRATION_PROVIDERS,
  useIntegrationApiConnections,
  type SocialIntegrationProvider,
  type IntegrationApiStatus,
} from "@/lib/kora";

export interface CalendarConnectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusMap(statuses: IntegrationApiStatus[]): Map<string, IntegrationApiStatus> {
  const m = new Map<string, IntegrationApiStatus>();
  for (const s of statuses) {
    m.set(s.provider, s);
  }
  return m;
}

export function CalendarConnectionsDialog({ open, onOpenChange }: CalendarConnectionsDialogProps) {
  const { statuses, loading, error, saveKey, saving } = useIntegrationApiConnections();
  const [keyTarget, setKeyTarget] = useState<SocialIntegrationProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  const byProvider = useMemo(() => statusMap(statuses), [statuses]);

  const openKeyEditor = (p: SocialIntegrationProvider) => {
    setKeyTarget(p);
    setApiKey("");
    setApiSecret("");
  };

  const closeKeyEditor = () => {
    setKeyTarget(null);
    setApiKey("");
    setApiSecret("");
  };

  const handleSaveKey = async () => {
    if (!keyTarget || !apiKey.trim()) {
      toast.error("Enter an API key.");
      return;
    }
    const res = await saveKey({
      provider: keyTarget.id,
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim() || null,
    });
    if (res.ok) {
      toast.success(
        res.masked_hint ? `API key saved (${res.masked_hint})` : "API key saved",
      );
      closeKeyEditor();
    } else {
      toast.error(res.error || "Could not save API key");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Connections
            </DialogTitle>
            <DialogDescription>
              Connect a social account by pasting API credentials from each provider&apos;s developer
              console. Keys are encrypted in Supabase and never shown in full—only a short hint.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="connections" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="mt-4 space-y-3">
              {loading && (
                <div className="flex justify-center py-8">
                  <Spinner className="h-8 w-8" />
                </div>
              )}
              {!loading && error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              {!loading &&
                !error &&
                SOCIAL_INTEGRATION_PROVIDERS.map((p) => {
                  const row = byProvider.get(p.id);
                  const connected = Boolean(row);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium leading-none">{p.label}</p>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                        {connected && row?.key_hint && (
                          <p className="text-xs text-muted-foreground">
                            Key hint: …{row.key_hint}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openKeyEditor(p)}
                          disabled={saving}
                        >
                          {connected ? "Replace key" : "Connect"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </TabsContent>

            <TabsContent value="integrations" className="mt-4">
              <p className="text-sm text-muted-foreground">
                OAuth and calendar integrations can be added here later. Use{" "}
                <strong>Connections</strong> for API keys.
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={keyTarget !== null} onOpenChange={(o) => !o && closeKeyEditor()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{keyTarget?.label ?? "API key"}</DialogTitle>
            <DialogDescription>
              Paste your API key from the provider&apos;s developer console. Optional app secret
              when the platform requires it (e.g. Meta).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="integration-api-key">API key</Label>
              <Input
                id="integration-api-key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-api-secret">App secret (optional)</Label>
              <Input
                id="integration-api-secret"
                type="password"
                autoComplete="off"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Only if required by the provider"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeKeyEditor} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSaveKey()} disabled={saving || !apiKey.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
