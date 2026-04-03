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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface CampaignConversionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTitle: string;
  onConfirm: (options: { createDraftPosts: boolean }) => Promise<void>;
}

export function CampaignConversionModal({
  open,
  onOpenChange,
  planTitle,
  onConfirm,
}: CampaignConversionModalProps) {
  const [createDraftPosts, setCreateDraftPosts] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm({ createDraftPosts });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert content plan to campaign</DialogTitle>
          <DialogDescription>
            This creates an operational campaign for <span className="font-medium">{planTitle}</span>{" "}
            and links your plan items. You can optionally add draft calendar slots from rows that have a
            date.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <Label htmlFor="draft-posts">Create draft scheduled posts</Label>
            <p className="text-xs text-muted-foreground">
              From items with a planned date (default time 12:00).
            </p>
          </div>
          <Switch
            id="draft-posts"
            checked={createDraftPosts}
            onCheckedChange={setCreateDraftPosts}
            disabled={loading}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
