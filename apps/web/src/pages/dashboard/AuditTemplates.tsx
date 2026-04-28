import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileUp, Image, FileText, MoreHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateAuditVisual } from "@/features/audit-visuals/api";
import { AuditTemplateDeckPreview } from "@/features/audit-visuals/AuditTemplateDeckPreview";
import { randomAuditVisualStyleSeed } from "@/features/audit-visuals/engine";

type TemplateRow = {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  storage_bucket: string;
  is_active: boolean;
  created_at: string;
};

type TemplateWithUrl = TemplateRow & {
  signedUrl: string | null;
};

type IndustryProfile = {
  id: string;
  industry_key: string;
  label: string;
  creative_direction: string;
  visual_cues: string[];
  avoid_rules: string[];
  tone_keywords: string[];
};

type AestheticSignal = {
  id: string;
  audit_id: string;
  lead_key: string;
  detected_industry: string | null;
  detected_aesthetic: string | null;
  recommended_vibe: string | null;
  confidence: number;
  created_at: string;
};

const BUCKET = "free-audit-templates";

function safeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-");
}

function fileTypeFor(file: File): "png" | "pdf" | null {
  if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) return "png";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function TemplateCoverPreview({ template, onOpen }: { template: TemplateWithUrl; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${template.title} audit preview`}
      className="relative block h-16 w-24 overflow-hidden rounded-lg border border-[#D8C28B]/60 bg-[#F7F3EA] text-left text-[#0A1A35] shadow-sm transition hover:border-gold/80 hover:shadow-md"
    >
      <div className="absolute right-0 top-0 h-7 w-7 rounded-bl-full bg-[#C59B3C]/20" />
      <div className="absolute bottom-0 left-0 h-1 w-full bg-[#0A1A35]" />
      <div className="relative z-10 flex h-full flex-col justify-between p-2">
        <div className="flex items-start justify-between border-b border-[#0A1A35]/15 pb-1">
          <div className="text-[8px] font-black leading-none">
            JK
            <br />
            PR
          </div>
          <div className="text-[6px] font-bold uppercase tracking-[0.18em] text-[#8C6C27]">Cover</div>
        </div>
        <div>
          <p className="line-clamp-2 font-serif text-[13px] font-bold leading-[0.9]">
            Brand Diagnosis
          </p>
          <div className="mt-1 h-0.5 w-8 bg-[#C59B3C]" />
        </div>
        <p className="truncate text-[5px] font-semibold uppercase tracking-[0.2em] text-[#0A1A35]/50">
          JahKnowsPR Firm
        </p>
      </div>
    </button>
  );
}

export default function AuditTemplates() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [generatedStyleSeed, setGeneratedStyleSeed] = useState<string | null>(null);
  const [generatedCreativeBriefSnapshot, setGeneratedCreativeBriefSnapshot] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [creativeDirection, setCreativeDirection] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [useDetectedAesthetic, setUseDetectedAesthetic] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [previewJustGenerated, setPreviewJustGenerated] = useState(false);
  const [selectedTemplatePreview, setSelectedTemplatePreview] = useState<TemplateWithUrl | null>(null);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["free-audit-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_audit_templates")
        .select("id,title,file_name,file_path,file_type,storage_bucket,is_active,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as TemplateRow[];
      return Promise.all(
        rows.map(async (row): Promise<TemplateWithUrl> => {
          const { data: signed } = await supabase.storage
            .from(row.storage_bucket || BUCKET)
            .createSignedUrl(row.file_path, 60 * 10);
          return { ...row, signedUrl: signed?.signedUrl ?? null };
        }),
      );
    },
  });

  const { data: industryProfiles } = useQuery({
    queryKey: ["audit-industry-inspiration-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_industry_inspiration_profiles")
        .select("id,industry_key,label,creative_direction,visual_cues,avoid_rules,tone_keywords")
        .eq("is_active", true)
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as IndustryProfile[];
    },
  });

  const { data: aestheticSignals } = useQuery({
    queryKey: ["audit-aesthetic-signals-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_aesthetic_signals")
        .select("id,audit_id,lead_key,detected_industry,detected_aesthetic,recommended_vibe,confidence,created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as AestheticSignal[];
    },
  });

  const selectedProfile = useMemo(() => {
    const rows = industryProfiles ?? [];
    if (selectedProfileId) return rows.find((profile) => profile.id === selectedProfileId) ?? null;
    return rows.find((profile) => profile.industry_key === "default_brand") ?? rows[0] ?? null;
  }, [industryProfiles, selectedProfileId]);

  const selectedSignal = useMemo(() => {
    const rows = aestheticSignals ?? [];
    if (selectedSignalId) return rows.find((signal) => signal.id === selectedSignalId) ?? null;
    return rows[0] ?? null;
  }, [aestheticSignals, selectedSignalId]);

  const generatedCreativeBrief = useMemo(() => {
    const profileBrief = selectedProfile
      ? [
        `Industry inspiration profile: ${selectedProfile.label}.`,
        selectedProfile.creative_direction,
        selectedProfile.visual_cues.length ? `Visual cues: ${selectedProfile.visual_cues.join(", ")}.` : "",
        selectedProfile.avoid_rules.length ? `Avoid: ${selectedProfile.avoid_rules.join(", ")}.` : "",
        selectedProfile.tone_keywords.length ? `Tone keywords: ${selectedProfile.tone_keywords.join(", ")}.` : "",
      ].filter(Boolean).join(" ")
      : "";
    const detectedBrief = useDetectedAesthetic && selectedSignal
      ? [
        `Detected lead aesthetic reference: ${selectedSignal.detected_aesthetic ?? "unknown"}.`,
        `Detected industry: ${selectedSignal.detected_industry ?? "unknown"}.`,
        `Recommended strategic vibe: ${selectedSignal.recommended_vibe ?? "use JahKnowsPR premium editorial rules"}.`,
        `Use this as strategic inspiration only; improve the brand, do not copy weak current design. Confidence ${Math.round(selectedSignal.confidence * 100)}%.`,
      ].join(" ")
      : "";
    return [profileBrief, detectedBrief, creativeDirection.trim()].filter(Boolean).join("\n");
  }, [creativeDirection, selectedProfile, selectedSignal, useDetectedAesthetic]);

  const uploadTemplate = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a PNG or PDF template.");
      const type = fileTypeFor(file);
      if (!type) throw new Error("Templates must be PNG or PDF files.");
      if (file.size > 10 * 1024 * 1024) throw new Error("Template must be 10MB or smaller.");

      const safeName = safeFileName(file.name);
      const path = `templates/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || (type === "png" ? "image/png" : "application/pdf"),
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: userData } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("free_audit_templates").insert({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        file_name: file.name,
        file_path: path,
        file_type: type,
        storage_bucket: BUCKET,
        is_active: false,
        created_by: userData.user?.id ?? null,
        metadata: {
          size_bytes: file.size,
          content_type: file.type,
          brand_locked: true,
          brand_colors: {
            navy: "#0A1A35",
            gold: "#C59B3C",
            gold_light: "#E6C769",
            off_white: "#F7F3EA",
          },
          required_logo_placement: ["cover_header_left", "page_header_left", "footer_brand_mark"],
          deck_pages: [
            "cover",
            "positioning_gap",
            "audience_clarity",
            "authority_structure",
            "messaging_angle",
            "conversion_path",
          ],
        },
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      setTitle("");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["free-audit-templates"] });
      toast.success("Audit template uploaded");
    },
    onError: (error: Error) => toast.error(error.message || "Could not upload template"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error: clearError } = await supabase
        .from("free_audit_templates")
        .update({ is_active: false })
        .eq("is_active", true);
      if (clearError) throw clearError;

      const { error } = await supabase
        .from("free_audit_templates")
        .update({ is_active: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free-audit-templates"] });
      toast.success("Template updated");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update template"),
  });

  const generateTemplatePreview = useMutation({
    mutationFn: async () => {
      setPreviewError(null);
      setPreviewJustGenerated(false);
      const styleSeed = randomAuditVisualStyleSeed();
      const templateName = generatedTitle.trim() || `Brand Diagnosis Template ${new Date().toLocaleDateString("en-US")}`;
      const visual = await generateAuditVisual(
        {
          client_name: "JahKnowsPR Client",
          positioning_score: 43,
          audience_score: 55,
          authority_score: 61,
          messaging_score: 67,
          conversion_score: 46,
          messaging_angle: "positioning_gap",
          primary_gap: "Positioning and conversion clarity gap",
          audience_pain: "Audience sees content but does not connect it to the offer",
          brand_tone: "premium editorial strategic",
          industry: selectedProfile?.label ?? selectedSignal?.detected_industry ?? "brand strategy and public relations",
          readiness_level: "WARM",
          lls_memory_context: useDetectedAesthetic && selectedSignal
            ? `latest_aesthetic_scan:${selectedSignal.detected_industry ?? "unknown"}:${selectedSignal.detected_aesthetic ?? "unknown"}`
            : "global_template_refresh_mode",
          creative_direction: generatedCreativeBrief || null,
          style_seed: styleSeed,
        },
        "hero",
      );
      return { ...visual, templateName, styleSeed, creativeBrief: generatedCreativeBrief };
    },
    onSuccess: (result) => {
      setGeneratedImageUrl(result.imageUrl);
      setGeneratedPrompt(result.prompt);
      setGeneratedStyleSeed(result.styleSeed);
      setGeneratedCreativeBriefSnapshot(result.creativeBrief || null);
      setPreviewError(null);
      setPreviewJustGenerated(true);
      window.setTimeout(() => setPreviewJustGenerated(false), 1200);
      toast.success("Template preview generated");
    },
    onError: (error: Error) => {
      const message = error.message || "Could not generate preview";
      setPreviewError(message);
      toast.error(message);
    },
  });

  const publishGeneratedTemplate = useMutation({
    mutationFn: async () => {
      if (!generatedImageUrl) throw new Error("Generate and preview a template first.");
      const blob = await fetch(generatedImageUrl).then((response) => response.blob());
      const fileName = `${safeFileName(generatedTitle.trim() || "brand-diagnosis-template")}.png`;
      const path = `templates/${crypto.randomUUID()}-${fileName}`;
      const uploadFile = new File([blob], fileName, { type: "image/png" });

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, uploadFile, {
          cacheControl: "3600",
          contentType: "image/png",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: userData } = await supabase.auth.getUser();
      const { error: clearError } = await supabase
        .from("free_audit_templates")
        .update({ is_active: false })
        .eq("is_active", true);
      if (clearError) throw clearError;

      const { error: insertError } = await supabase.from("free_audit_templates").insert({
        title: generatedTitle.trim() || "Brand Diagnosis Template",
        file_name: fileName,
        file_path: path,
        file_type: "png",
        storage_bucket: BUCKET,
        is_active: true,
        created_by: userData.user?.id ?? null,
        metadata: {
          generated: true,
          source: "template_preview_generator",
          prompt: generatedPrompt ?? null,
          style_seed: generatedStyleSeed,
          creative_direction: generatedCreativeBriefSnapshot,
          industry_profile_id: selectedProfile?.id ?? null,
          industry_profile_key: selectedProfile?.industry_key ?? null,
          industry_profile_label: selectedProfile?.label ?? null,
          aesthetic_signal_id: useDetectedAesthetic ? selectedSignal?.id ?? null : null,
          detected_industry: useDetectedAesthetic ? selectedSignal?.detected_industry ?? null : null,
          detected_aesthetic: useDetectedAesthetic ? selectedSignal?.detected_aesthetic ?? null : null,
          recommended_vibe: useDetectedAesthetic ? selectedSignal?.recommended_vibe ?? null : null,
          brand_locked: true,
          brand_colors: {
            navy: "#0A1A35",
            gold: "#C59B3C",
            gold_light: "#E6C769",
            off_white: "#F7F3EA",
          },
          required_logo_placement: ["cover_header_left", "page_header_left", "footer_brand_mark"],
          deck_pages: [
            "cover",
            "positioning_gap",
            "audience_clarity",
            "authority_structure",
            "messaging_angle",
            "conversion_path",
          ],
        },
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free-audit-templates"] });
      setPreviewOpen(false);
      setGeneratedImageUrl(null);
      setGeneratedPrompt(null);
      setGeneratedStyleSeed(null);
      setGeneratedCreativeBriefSnapshot(null);
      setGeneratedTitle("");
      toast.success("Published as active funnel template");
    },
    onError: (error: Error) => toast.error(error.message || "Could not publish generated template"),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    uploadTemplate.mutate();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-3">
            <Link to="/dashboard/audits">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Audits
            </Link>
          </Button>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">Free Audit</p>
          <h1 className="text-3xl font-bold">Audit Templates</h1>
          <p className="text-muted-foreground">Upload or generate fresh templates. One active template powers the main audit funnel.</p>
        </div>
        <Button
          onClick={() => setPreviewOpen(true)}
          className="w-full lg:w-auto"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate New Template
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="template-title">Template name</Label>
          <Input
            id="template-title"
            placeholder="Positioning Gap Audit"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-file">PNG or PDF</Label>
          <Input
            id="template-file"
            type="file"
            accept="image/png,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" disabled={uploadTemplate.isPending}>
          <FileUp className="mr-2 h-4 w-4" />
          {uploadTemplate.isPending ? "Uploading..." : "Upload"}
        </Button>
      </form>

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-center">Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading templates...</TableCell>
              </TableRow>
            ) : !templates?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No audit templates uploaded yet.</TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                        {template.file_type === "png" ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{template.title}</p>
                        <p className="text-xs text-muted-foreground">{template.file_name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{template.file_type.toUpperCase()}</TableCell>
                  <TableCell>
                    {template.is_active ? (
                      <Button size="sm" className="h-7 rounded-full bg-emerald-600 px-3 text-xs hover:bg-emerald-700">
                        Live
                      </Button>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(template.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-center gap-3">
                      <TemplateCoverPreview
                        template={template}
                        onOpen={() => setSelectedTemplatePreview(template)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Template settings</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {template.is_active ? "Active Template" : "Template Settings"}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedTemplatePreview(template)}>
                            Open preview
                          </DropdownMenuItem>
                          {!template.is_active ? (
                            <DropdownMenuItem onClick={() => toggleActive.mutate({ id: template.id })}>
                              Set active
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selectedTemplatePreview)} onOpenChange={(open) => !open && setSelectedTemplatePreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplatePreview?.title ?? "Audit Template Preview"}</DialogTitle>
            <DialogDescription>
              In-page preview of the audit cover, ratings page, and deliverable breakdowns.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplatePreview ? (
            <AuditTemplateDeckPreview
              title={selectedTemplatePreview.title}
              imageUrl={selectedTemplatePreview.signedUrl}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Generate New Audit Template</DialogTitle>
            <DialogDescription>
              Create a fresh branded template, preview it, then publish it as the active funnel template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="generated-template-title">Template title</Label>
              <Input
                id="generated-template-title"
                placeholder="May 2026 Brand Diagnosis Edition"
                value={generatedTitle}
                onChange={(event) => setGeneratedTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Industry inspiration profile</Label>
                <Select
                  value={selectedProfile?.id ?? ""}
                  onValueChange={setSelectedProfileId}
                  disabled={!industryProfiles?.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an industry profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {(industryProfiles ?? []).map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sets the base creative lane before your custom notes are added.
                </p>
              </div>
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="detected-aesthetic">Use detected lead aesthetic</Label>
                    <p className="text-xs text-muted-foreground">
                      Optional. Uses recent funnel scans as inspiration, not a style copy.
                    </p>
                  </div>
                  <Switch
                    id="detected-aesthetic"
                    checked={useDetectedAesthetic}
                    onCheckedChange={setUseDetectedAesthetic}
                  />
                </div>
                {useDetectedAesthetic ? (
                  <Select
                    value={selectedSignal?.id ?? ""}
                    onValueChange={setSelectedSignalId}
                    disabled={!aestheticSignals?.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Latest detected aesthetic" />
                    </SelectTrigger>
                    <SelectContent>
                      {(aestheticSignals ?? []).map((signal) => (
                        <SelectItem key={signal.id} value={signal.id}>
                          {(signal.detected_industry ?? "unknown").replace(/_/g, " ")} · {signal.detected_aesthetic ?? "aesthetic"} · {formatDate(signal.created_at)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creative-direction">Creative inspiration / art direction</Label>
              <Textarea
                id="creative-direction"
                placeholder="Example: make it feel like a luxury editorial report, A24 title card, architectural brand blueprint, bold navy negative space, subtle gold tension lines..."
                value={creativeDirection}
                onChange={(event) => setCreativeDirection(event.target.value)}
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">
                Use this like a creative brief. KORA combines it with the selected industry profile and a fresh internal style seed.
              </p>
            </div>

            {generatedImageUrl ? (
              <AuditTemplateDeckPreview
                title={generatedTitle.trim() || "Brand Diagnosis Edition"}
                imageUrl={generatedImageUrl}
              />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-xl border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  {generateTemplatePreview.isPending ? "Generating preview..." : "Click Generate Preview to create a new template."}
                </p>
              </div>
            )}
            {previewError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-semibold">Preview generation failed</p>
                <p className="mt-1 break-words">{previewError}</p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => generateTemplatePreview.mutate()}
                disabled={generateTemplatePreview.isPending}
                className={
                  generateTemplatePreview.isPending
                    ? "animate-pulse border-gold bg-gold/20 text-gold shadow-[0_0_24px_rgba(197,155,60,0.55)]"
                    : previewJustGenerated
                      ? "border-gold bg-gold text-[#0A1A35] shadow-[0_0_18px_rgba(197,155,60,0.35)]"
                      : ""
                }
              >
                <Sparkles className={`mr-2 h-4 w-4 ${generateTemplatePreview.isPending ? "animate-spin" : ""}`} />
                {generateTemplatePreview.isPending ? "Generating..." : "Generate Preview"}
              </Button>
              <Button
                onClick={() => publishGeneratedTemplate.mutate()}
                disabled={!generatedImageUrl || publishGeneratedTemplate.isPending}
              >
                {publishGeneratedTemplate.isPending ? "Publishing..." : "Publish as Active Template"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
