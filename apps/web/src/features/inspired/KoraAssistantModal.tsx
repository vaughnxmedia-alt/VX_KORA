import { useState, useCallback } from "react";
import { Pin, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchKoraInspiration, type KoraSuggestion } from "./api/koraInspiration";

export interface KoraAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPinAll?: (suggestions: KoraSuggestion[]) => void;
}

export function KoraAssistantModal({
  open,
  onOpenChange,
  onPinAll,
}: KoraAssistantModalProps) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [tone, setTone] = useState("");
  const [platform, setPlatform] = useState("");
  const [constraints, setConstraints] = useState("");
  const [suggestions, setSuggestions] = useState<KoraSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchKoraInspiration({
        query: query || undefined,
        industry: industry || undefined,
        audience: audience || undefined,
        campaignName: campaignName || undefined,
        tone: tone || undefined,
        platform: platform || undefined,
        constraints: constraints || undefined,
      });
      setSuggestions(res.suggestions);
    } finally {
      setLoading(false);
    }
  }, [query, industry, audience, campaignName, tone, platform, constraints]);

  const handlePinAll = useCallback(() => {
    if (suggestions.length > 0) onPinAll?.(suggestions);
    onOpenChange(false);
  }, [suggestions, onPinAll, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f10] border-white/10 text-white max-w-lg max-h-[90vh] overflow-auto p-0 gap-0">
        {/* KORA brand header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 bg-gradient-to-b from-[#1a1a1b] to-[#0f0f10]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-400/90 tracking-tighter">K</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">KORA</h2>
              <p className="text-xs text-white/50 mt-0.5">AI-powered creative intelligence for your campaigns</p>
            </div>
            <Sparkles className="w-5 h-5 text-amber-400/60 ml-auto shrink-0" />
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
        <p className="text-sm text-white/70">What are you trying to create?</p>
        <div className="space-y-4">
          <Textarea
            placeholder="Describe your project, campaign, or goal…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[80px] rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/60 text-xs">Industry</Label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Tech"
                className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Audience</Label>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. B2B"
                className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Campaign name</Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Tone</Label>
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. Professional"
                className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Platform</Label>
              <Input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g. Instagram"
                className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-white/60 text-xs">Constraints</Label>
              <Input
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="Optional"
                className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-medium"
          >
            {loading ? "KORA is finding references..." : "Get KORA suggestions"}
          </Button>
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
                <span className="text-amber-400/80 font-semibold">KORA</span> references
              </h4>
              <ul className="space-y-2 max-h-48 overflow-auto">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                  >
                    <p className="font-medium text-white/90">{s.title}</p>
                    {s.summary && <p className="text-white/60 text-xs mt-1">{s.summary}</p>}
                    {s.rationale && <p className="text-white/50 text-xs mt-1">{s.rationale}</p>}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePinAll}
                className="w-full rounded-lg border-amber-500/30 text-amber-200/90 hover:bg-amber-500/10"
              >
                <Pin className="w-4 h-4 mr-2" />
                Pin all to board
              </Button>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
