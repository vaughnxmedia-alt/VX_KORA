import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ciApi } from "../api";
import { ciFriendlyError } from "../workspace";

export function CiDeleteClientDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [typedName, setTypedName] = useState("");
  const matches = typedName.trim().toLowerCase() === organizationName.trim().toLowerCase();

  const remove = useMutation({
    mutationFn: () => ciApi.organizations.remove(organizationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ci"] });
      toast.success(`${organizationName} was deleted.`);
      setTypedName("");
      onOpenChange(false);
      navigate("/hq/intelligence");
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTypedName("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Delete this client?</DialogTitle>
          <DialogDescription>
            This removes {organizationName} and their communications plan, recommendations,
            opportunities, actions, and portal access. The HQ client record is not deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="ci-delete-client-name">Type the client name to confirm</Label>
          <Input
            id="ci-delete-client-name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={organizationName}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Keep client
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!matches || remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? "Deleting…" : "Delete client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
