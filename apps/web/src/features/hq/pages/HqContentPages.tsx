import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MDEditor from "@uiw/react-md-editor";
import { hqApi, logHqActivity } from "../api";
import {
  CONTENT_TYPE_LABELS,
  type ContentType,
  type HqContentPost,
} from "../types";
import {
  buildPublicationPayload,
  PUBLICATION_STATUS_LABELS,
  resolvePublicationStatus,
  type PublicationStatus,
} from "@/lib/blog-publication-status";
import { Button } from "@/components/ui/button";
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
import { ImageUploader } from "@/components/blog/ImageUploader";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function publicPathFor(post: Pick<HqContentPost, "content_type" | "slug">) {
  const slug = post.slug || "";
  if (post.content_type === "the-brief") return `/the-brief/${slug}`;
  if (post.content_type === "spam-report") return `/insights/spam-report`;
  if (post.content_type === "pr-court") return `/insights/pr-court`;
  if (post.content_type === "case-study") return `/work`;
  return `/insights`;
}

export function HqContentListPage() {
  const [params] = useSearchParams();
  const typeFilter = (params.get("type") as ContentType | null) || null;
  const statusFilter = params.get("status") as PublicationStatus | "all" | null;
  const navigate = useNavigate();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["hq", "content", typeFilter],
    queryFn: () => hqApi.content.list(typeFilter ?? undefined),
  });

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (typeFilter && (p.content_type || "the-brief") !== typeFilter) return false;
      if (statusFilter && statusFilter !== "all") {
        const st = resolvePublicationStatus(p);
        if (statusFilter === "draft" && st !== "draft") return false;
        if (statusFilter === "scheduled" && st !== "scheduled") return false;
        if (statusFilter === "live" && st !== "live") return false;
      }
      return true;
    });
  }, [posts, typeFilter, statusFilter]);

  const statusChips: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "scheduled", label: "Scheduled" },
    { id: "live", label: "Published" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Content</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish The Brief, SPAM Report, PR Court, Case Studies, and Firm News
          </p>
        </div>
        <Button onClick={() => navigate("/hq/content/new")}>
          <Plus className="h-4 w-4 mr-1" />
          New post
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusChips.map((c) => {
          const active = (statusFilter || "all") === c.id;
          const href =
            c.id === "all"
              ? typeFilter
                ? `/hq/content?type=${typeFilter}`
                : "/hq/content"
              : typeFilter
                ? `/hq/content?type=${typeFilter}&status=${c.id}`
                : `/hq/content?status=${c.id}`;
          return (
            <Link
              key={c.id}
              to={href}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Author</th>
                <th className="px-3 py-2 font-medium">Publish date</th>
                <th className="px-3 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const st = resolvePublicationStatus(p);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <Link to={`/hq/content/${p.id}`} className="text-primary font-medium hover:underline">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {CONTENT_TYPE_LABELS[(p.content_type as ContentType) || "the-brief"]}
                    </td>
                    <td className="px-3 py-2">{PUBLICATION_STATUS_LABELS[st]}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.author_name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.published_date || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.updated_at ? p.updated_at.slice(0, 10) : "—"}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No content in this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HqContentEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [preview, setPreview] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ["hq", "content", id],
    queryFn: () => hqApi.content.get(id!),
    enabled: !isNew && Boolean(id),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["hq", "clients"],
    queryFn: () => hqApi.clients.list(),
  });

  const [form, setForm] = useState<Partial<HqContentPost> | null>(null);
  const active = form ?? post ?? {
    title: "",
    slug: "",
    content_type: "the-brief" as ContentType,
    excerpt: "",
    description: "",
    content: "",
    cover_image_url: "",
    author_name: (profile as { full_name?: string } | null)?.full_name || user?.email || "JahKnowsPR",
    category: "Strategy",
    tags: [] as string[],
    seo_title: "",
    seo_description: "",
    is_featured: false,
    publication_status: "draft",
    status: "draft",
    published_date: new Date().toISOString().slice(0, 10),
    publish_scheduled_at: null,
    hq_client_id: null,
  };

  const setField = <K extends keyof HqContentPost>(key: K, value: HqContentPost[K]) => {
    setForm({ ...active, [key]: value } as HqContentPost);
  };

  const save = useMutation({
    mutationFn: async (opts: { status: PublicationStatus }) => {
      const title = active.title?.trim();
      if (!title) throw new Error("Title is required");
      const slug = (active.slug || slugify(title)).trim();
      const pub = buildPublicationPayload(opts.status, {
        publishMode: opts.status === "scheduled" ? "schedule" : "publish_now",
        publishedDateYmd: active.published_date || new Date().toISOString().slice(0, 10),
        publishScheduledAt: active.publish_scheduled_at,
        publishedAtIso: new Date().toISOString(),
      });
      const payload = {
        id: isNew ? undefined : id,
        title,
        slug,
        content_type: active.content_type || "the-brief",
        excerpt: active.excerpt || null,
        description: active.seo_description || active.description || active.excerpt || null,
        content: active.content || "",
        cover_image_url: active.cover_image_url || null,
        author_name: active.author_name || null,
        author_id: isNew ? user?.id ?? null : active.author_id,
        category: active.category || CONTENT_TYPE_LABELS[(active.content_type as ContentType) || "the-brief"],
        tags: active.tags || [],
        seo_title: active.seo_title || title,
        seo_description: active.seo_description || active.excerpt || null,
        is_featured: Boolean(active.is_featured),
        published_date: active.published_date || new Date().toISOString().slice(0, 10),
        hq_client_id: active.hq_client_id || null,
        ...pub,
      };
      const saved = await hqApi.content.upsert(payload as Partial<HqContentPost> & { title: string });
      if (opts.status === "live") {
        await logHqActivity({
          action: "content_published",
          entity_type: "content",
          entity_id: saved.id,
          summary: `Published: ${saved.title}`,
        });
      }
      return saved;
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ["hq", "content"] });
      void qc.invalidateQueries({ queryKey: ["hq", "activity"] });
      toast.success("Saved");
      navigate(`/hq/content/${saved.id}`);
      setForm(null);
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  if (!isNew && isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/hq/content")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to content
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold">{isNew ? "New content" : "Edit content"}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPreview((p) => !p)}>
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button
            variant="secondary"
            disabled={save.isPending}
            onClick={() => save.mutate({ status: "draft" })}
          >
            Save Draft
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate({ status: "live" })}>
            Publish
          </Button>
        </div>
      </div>

      {preview ? (
        <article className="rounded-lg border border-border bg-background p-6 prose prose-slate max-w-none">
          <p className="text-xs uppercase tracking-wide text-gold-dark not-prose mb-2">
            {CONTENT_TYPE_LABELS[(active.content_type as ContentType) || "the-brief"]}
          </p>
          <h1>{active.title}</h1>
          <MDEditor.Markdown source={active.content || ""} />
        </article>
      ) : (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={active.title ?? ""}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm({
                    ...active,
                    title,
                    slug: isNew || !active.slug ? slugify(title) : active.slug,
                  } as HqContentPost);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={active.slug ?? ""} onChange={(e) => setField("slug", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Content type</Label>
              <Select
                value={(active.content_type as string) || "the-brief"}
                onValueChange={(v) => setField("content_type", v as ContentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Excerpt</Label>
              <Textarea
                rows={2}
                value={active.excerpt ?? ""}
                onChange={(e) => setField("excerpt", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Author</Label>
              <Input
                value={active.author_name ?? ""}
                onChange={(e) => setField("author_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={active.category ?? ""}
                onChange={(e) => setField("category", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={(active.tags || []).join(", ")}
                onChange={(e) =>
                  setField(
                    "tags",
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Publish date</Label>
              <Input
                type="date"
                value={active.published_date ?? ""}
                onChange={(e) => setField("published_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SEO title</Label>
              <Input
                value={active.seo_title ?? ""}
                onChange={(e) => setField("seo_title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta description</Label>
              <Input
                value={active.seo_description ?? ""}
                onChange={(e) => setField("seo_description", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Link to client (optional)</Label>
              <Select
                value={active.hq_client_id ?? "none"}
                onValueChange={(v) => setField("hq_client_id", v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={Boolean(active.is_featured)}
                onCheckedChange={(v) => setField("is_featured", v)}
              />
              <Label>Featured</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Featured image</Label>
            <ImageUploader
              value={active.cover_image_url || undefined}
              onChange={(url) => setField("cover_image_url", url)}
              label="Upload featured image"
            />
          </div>

          <div className="space-y-2" data-color-mode="light">
            <Label>Body</Label>
            <MDEditor
              value={active.content || ""}
              onChange={(v) => setField("content", v || "")}
              height={420}
            />
          </div>

          {!isNew && active.slug ? (
            <p className="text-xs text-muted-foreground">
              Public path (when published):{" "}
              <a
                className="text-primary underline"
                href={publicPathFor({
                  content_type: (active.content_type as ContentType) || "the-brief",
                  slug: active.slug,
                })}
                target="_blank"
                rel="noreferrer"
              >
                {publicPathFor({
                  content_type: (active.content_type as ContentType) || "the-brief",
                  slug: active.slug,
                })}
              </a>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
