import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getPublicSiteOrigin } from "@/lib/publicSite";

const TELEGRAM_BOT_URL = "https://t.me/VX_kora_bot";

type LinkRow = { id: string; label: string; url: string };

export function ShareLeadMagnetLinksDialog() {
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rows: LinkRow[] = useMemo(() => {
    const origin = getPublicSiteOrigin();
    return [
      { id: "telegram", label: "Telegram (KORA bot)", url: TELEGRAM_BOT_URL },
      { id: "strategy", label: "Strategy intake (paid Strategy Session)", url: `${origin}/strategy-session` },
      {
        id: "creative",
        label: "Creative work & production consultation",
        url: `${origin}/consultation/creative-production`,
      },
      {
        id: "campaign",
        label: "Campaign & retainer consultation",
        url: `${origin}/consultation/campaign-retainer`,
      },
      {
        id: "kora-platform",
        label: "Full KORA platform inquiry",
        url: `${origin}/consultation/kora-platform`,
      },
    ];
  }, []);

  const copy = async (row: LinkRow) => {
    try {
      await navigator.clipboard.writeText(row.url);
      setCopiedId(row.id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy — select the link and copy manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Share2 className="mr-2 h-4 w-4" />
          Share Lead Mag Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Lead Mag Link</DialogTitle>
          <DialogDescription>
            Copy links to share with leads. Telegram opens the KORA bot; the others go to intake and short consultation
            questionnaires. After you connect the domain on Vercel, set <code className="rounded bg-muted px-1 text-xs">VITE_PUBLIC_SITE_URL</code> so
            these URLs use your live domain instead of localhost.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {rows.map((row) => (
            <div key={row.id} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{row.label}</Label>
              <div className="flex gap-2">
                <Input readOnly value={row.url} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={() => copy(row)} aria-label="Copy link">
                  {copiedId === row.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
