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
import { Textarea } from "@/components/ui/textarea";
import { Copy, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { getPublicSiteOrigin } from "@/lib/publicSite";
import { buildStrategySessionUpsellEmailPreview } from "@/features/leads/buildStrategySessionUpsellEmailPreview";

type CopiedTarget = "subject" | "body" | "html" | null;

export function StrategySessionUpsellEmailPreviewDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<CopiedTarget>(null);

  const preview = useMemo(() => {
    const origin = getPublicSiteOrigin();
    return buildStrategySessionUpsellEmailPreview({
      strategySessionUrl: `${origin}/strategy-session`,
    });
  }, []);

  const copy = async (target: Exclude<CopiedTarget, null>, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy — select the text and copy manually.");
    }
  };

  const CopyIcon = ({ target }: { target: Exclude<CopiedTarget, null> }) =>
    copied === target ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail className="mr-2 h-4 w-4" />
          Strategy Session Email Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Strategy Session purchase + scheduling email</DialogTitle>
          <DialogDescription>
            Use this when an audit lead, phone conversation, or in-person prospect is ready to be moved toward the paid
            $150 Strategy Session checkout and calendar flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="strategy-upsell-subject">Subject</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copy("subject", preview.subject)}
              >
                <CopyIcon target="subject" />
                <span className="ml-2">Copy</span>
              </Button>
            </div>
            <Input id="strategy-upsell-subject" readOnly value={preview.subject} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy-upsell-preview">Preview line</Label>
            <Input id="strategy-upsell-preview" readOnly value={preview.previewLine} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="strategy-upsell-body">Plain text body</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copy("body", preview.bodyText)}
              >
                <CopyIcon target="body" />
                <span className="ml-2">Copy</span>
              </Button>
            </div>
            <Textarea
              id="strategy-upsell-body"
              readOnly
              value={preview.bodyText}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="strategy-upsell-html">HTML email body</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copy("html", preview.bodyHtml)}
              >
                <CopyIcon target="html" />
                <span className="ml-2">Copy HTML</span>
              </Button>
            </div>
            <Textarea
              id="strategy-upsell-html"
              readOnly
              value={preview.bodyHtml}
              className="min-h-[260px] font-mono text-xs"
            />
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            Replace <code>[First Name]</code> before sending. This email is for upsell/scheduling before purchase; the
            checkout thank-you and pending-confirmation emails still send from the Strategy Session flow after payment.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
