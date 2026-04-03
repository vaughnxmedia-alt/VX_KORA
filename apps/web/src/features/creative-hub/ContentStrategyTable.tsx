import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { CREATIVE_PILLAR_OPTIONS } from "./strategyModel";

type ContentPlanItem = Tables<"content_plan_items">;

const PILLAR_NONE = "__none__";

interface ContentStrategyTableProps {
  activePlanId: string | null;
  linkedCampaignId: string | null;
  items: ContentPlanItem[];
  itemsLoading: boolean;
  onAddRow: () => void;
  addPending: boolean;
  onUpdateRow: (row: Pick<ContentPlanItem, "id"> & Partial<ContentPlanItem>) => void;
  onDeleteRow: (id: string) => void;
  /** Row id currently being deleted (for per-row spinner). */
  deletingRowId: string | null;
  onSubmitCampaign: () => void;
  submitDisabled: boolean;
  submitToCampaignPending?: boolean;
}

export function ContentStrategyTable({
  activePlanId,
  linkedCampaignId,
  items,
  itemsLoading,
  onAddRow,
  addPending,
  onUpdateRow,
  onDeleteRow,
  deletingRowId,
  onSubmitCampaign,
  submitDisabled,
  submitToCampaignPending = false,
}: ContentStrategyTableProps) {
  const locked = !!linkedCampaignId;
  const selectContentClass = "z-[100] max-h-[min(24rem,70vh)]";

  const showPlaceholderRow =
    !!activePlanId && !itemsLoading && items.length === 0 && !locked;

  const showNoPlanRow = !activePlanId && !itemsLoading;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Ideas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 min-w-[3rem] text-center">#</TableHead>
                <TableHead className="min-w-[200px]">Pillar</TableHead>
                <TableHead className="min-w-[180px]">Content idea</TableHead>
                <TableHead className="min-w-[140px]">Hook</TableHead>
                <TableHead className="min-w-[120px]">Format</TableHead>
                <TableHead className="min-w-[120px]">Platform</TableHead>
                <TableHead className="w-12 min-w-[2.75rem] p-2 text-right">
                  <span className="sr-only">Delete</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline" />
                  </TableCell>
                </TableRow>
              )}

              {!itemsLoading && showNoPlanRow && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={7} className="text-sm text-muted-foreground py-8 text-center">
                    Generate a strategy above.
                  </TableCell>
                </TableRow>
              )}

              {!itemsLoading && showPlaceholderRow && (
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={7} className="text-sm text-muted-foreground py-8 text-center">
                    Use K.O.R.A below or Add row.
                  </TableCell>
                </TableRow>
              )}

              {!itemsLoading &&
                activePlanId &&
                items.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="align-top text-sm text-muted-foreground py-3 text-center tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="align-top min-w-[200px]">
                      <Select
                        value={
                          row.pillar &&
                          CREATIVE_PILLAR_OPTIONS.some((p) => p.value === row.pillar)
                            ? row.pillar
                            : PILLAR_NONE
                        }
                        disabled={locked}
                        onValueChange={(v) =>
                          onUpdateRow({
                            id: row.id,
                            pillar: v === PILLAR_NONE ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pillar" />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          <SelectItem value={PILLAR_NONE}>Select pillar</SelectItem>
                          {CREATIVE_PILLAR_OPTIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        key={`t-${activePlanId}-${row.id}`}
                        placeholder="Content idea"
                        defaultValue={row.title ?? ""}
                        disabled={locked}
                        onBlur={(e) => onUpdateRow({ id: row.id, title: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        key={`hk-${activePlanId}-${row.id}`}
                        placeholder="Hook"
                        defaultValue={row.hook ?? ""}
                        disabled={locked}
                        onBlur={(e) => onUpdateRow({ id: row.id, hook: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        key={`fm-${activePlanId}-${row.id}`}
                        placeholder="e.g. Reel"
                        defaultValue={row.format ?? ""}
                        disabled={locked}
                        onBlur={(e) => onUpdateRow({ id: row.id, format: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        key={`pl-${activePlanId}-${row.id}`}
                        placeholder="e.g. Instagram"
                        defaultValue={row.platform ?? ""}
                        disabled={locked}
                        onBlur={(e) => onUpdateRow({ id: row.id, platform: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell className="align-top w-12 p-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={locked || deletingRowId === row.id}
                        onClick={() => onDeleteRow(row.id)}
                        aria-label={`Delete idea ${index + 1}`}
                      >
                        {deletingRowId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddRow}
            disabled={addPending || locked || !activePlanId}
            className="gap-1.5 w-fit"
          >
            {addPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add row
          </Button>

          <Button
            type="button"
            variant={submitDisabled && !submitToCampaignPending ? "secondary" : "default"}
            onClick={onSubmitCampaign}
            disabled={submitDisabled || submitToCampaignPending}
            className="gap-2 w-full sm:w-auto"
          >
            {submitToCampaignPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit to campaign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
