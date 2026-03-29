import { useState, useCallback } from "react";
import { Search, Pin, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getConnector } from "./connectors";
import type { SearchResult, SearchFilters } from "./connectors";

export interface InspiredInspirationTabProps {
  boardId: string | null;
  onPinToBoard: (payload: { title: string; sourceUrl?: string; thumbnailUrl?: string; summary?: string }, x?: number, y?: number) => void;
}

const SOURCE_NAMES = ["Internal", "Shotdeck", "Motion Array", "Adobe Stock"];

export function InspiredInspirationTab({ boardId, onPinToBoard }: InspiredInspirationTabProps) {
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<Set<string>>(new Set(["Internal"]));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const conns = SOURCE_NAMES.filter((n) => sources.has(n)).map((n) => getConnector(n)).filter(Boolean);
      const all: SearchResult[] = [];
      for (const c of conns) {
        if (!c) continue;
        const list = await c.search(query, filters);
        all.push(...list);
      }
      setResults(all);
    } finally {
      setLoading(false);
    }
  }, [query, sources, filters]);

  const toggleSource = (name: string) => {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-medium text-white/90">Inspiration</h3>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search inspiration..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="pl-9 h-9 rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={runSearch}
          disabled={loading}
          className="rounded-lg h-9 bg-white/10 hover:bg-white/20 text-white"
        >
          Search
        </Button>
      </div>
      <div>
        <p className="text-xs text-white/50 mb-2">Sources</p>
        <div className="flex flex-wrap gap-2">
          {SOURCE_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleSource(name)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                sources.has(name) ? "bg-white/15 text-white" : "bg-white/5 text-white/50 hover:text-white/70"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {loading && <p className="text-white/50 text-sm">Searching...</p>}
        {!loading && results.length === 0 && query && (
          <p className="text-white/50 text-sm">No results. Try different sources or query.</p>
        )}
        {!loading && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((r) => (
              <li
                key={`${r.sourceName}-${r.id}`}
                className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2"
              >
                {r.thumbnailUrl && (
                  <img src={r.thumbnailUrl} alt="" className="w-full h-24 object-cover rounded" />
                )}
                <p className="text-sm text-white/90 font-medium truncate">{r.title}</p>
                <p className="text-xs text-white/50">{r.sourceName}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onPinToBoard({ title: r.title, sourceUrl: r.sourceUrl ?? undefined, thumbnailUrl: r.thumbnailUrl ?? undefined })}
                    disabled={!boardId}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/10 text-white/90 hover:bg-white/20 disabled:opacity-50"
                  >
                    <Pin className="w-3 h-3" /> Pin to Board
                  </button>
                  {r.sourceUrl && (
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/10 text-white/90 hover:bg-white/20"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Source
                    </a>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/10 text-white/90 hover:bg-white/20"
                    title="Summarize (KORA)"
                  >
                    <FileText className="w-3 h-3" /> Summarize
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
