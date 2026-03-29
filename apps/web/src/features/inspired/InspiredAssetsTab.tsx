import { useEffect, useState } from "react";
import { Pin, FileImage, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface InspiredAssetsTabProps {
  boardId: string | null;
  onPinToBoard: (assetId: string, x?: number, y?: number) => void;
}

interface AssetRow {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  public_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export function InspiredAssetsTab({ boardId, onPinToBoard }: InspiredAssetsTabProps) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error } = await supabase
        .from("inspired_assets")
        .select("id, filename, mime_type, size_bytes, public_url, thumbnail_url, created_at")
        .order("created_at", { ascending: false });
      if (mounted && !error) setAssets((data as AssetRow[]) ?? []);
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-medium text-white/90">Assets</h3>
      {loading ? (
        <p className="text-white/50 text-sm">Loading…</p>
      ) : assets.length === 0 ? (
        <p className="text-white/50 text-sm">No uploaded assets yet. Use Upload tool to add files.</p>
      ) : (
        <ul className="space-y-2">
          {assets.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
            >
              {a.thumbnail_url ? (
                <img src={a.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              ) : a.mime_type?.startsWith("video/") ? (
                <FileText className="w-10 h-10 text-white/40 shrink-0" />
              ) : (
                <FileImage className="w-10 h-10 text-white/40 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/90 truncate">{a.filename}</p>
                {a.size_bytes != null && (
                  <p className="text-xs text-white/50">
                    {(a.size_bytes / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onPinToBoard(a.id)}
                disabled={!boardId}
                className="shrink-0 p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
                title="Pin to Board"
              >
                <Pin className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
