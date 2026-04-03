import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface LogisticsDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSkip: () => void | Promise<void>;
}

export function LogisticsDecisionModal({
  open,
  onOpenChange,
  campaignId,
  onSkip,
}: LogisticsDecisionModalProps) {
  const navigate = useNavigate();

  const goLogistics = () => {
    onOpenChange(false);
    navigate(`/dashboard/logistics?campaignId=${encodeURIComponent(campaignId)}`);
  };

  const skip = async () => {
    await onSkip();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Logistics</DialogTitle>
          <DialogDescription>
            Capture shoot times, locations, vendors, and production notes for this campaign now, or skip
            and add them later from Campaigns or Logistics.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={skip}>
            Not needed right now
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={goLogistics}>
            Open logistics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
