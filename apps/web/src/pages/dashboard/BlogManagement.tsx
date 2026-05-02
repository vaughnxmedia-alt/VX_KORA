import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Tag,
  Edit3,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  FileText,
  Image,
  Link2,
  Video,
  CheckCircle2,
  PenLine,
  Sparkles,
  Flame,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostgrestError } from "@supabase/supabase-js";
import MDEditor from '@uiw/react-md-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { ImageUploader } from "@/components/blog/ImageUploader";
import { GalleryUploader } from "@/components/blog/GalleryUploader";
import {
  BLOG_PUBLISH_TIMEZONE,
  buildPublishScheduledAtIso,
  formatBlogPublishScheduleDisplay,
  isBlogPostPubliclyLive,
} from "@/lib/blog-publish-schedule";
import { VideoUploader } from "@/components/blog/VideoUploader";
import { BlogShareDialog } from "@/components/blog/BlogShareDialog";

type BlogPost = {
  id?: string;
  created_at?: string;
  updated_at?: string | null;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  tagline: string | null;
  description: string | null;
  content: string | null;
  category: string | null;
  read_time: string | null;
  published_date: string | null;
  publish_scheduled_at?: string | null;
  author_name: string | null;
  is_featured: boolean | null;
  is_hot_topic: boolean | null;
  is_hidden: boolean | null;
  icon_name: string | null;
  tags: string[] | null;
  video_url: string | null;
  video_type?: "embed" | "upload" | null;
  cover_image_url?: string | null;
  gallery_image_urls?: string[] | null;
  status?: "draft" | "published" | null;
  published_at?: string | null;
  author_id?: string | null;
};

const PUBLIC_SITE_ORIGIN = "https://www.jahknowspr.com";
const CUSTOM_LINK_TARGET = "custom";

const CORE_SEO_LINKS = [
  {
    id: "free-audit",
    label: "Free Audit",
    url: `${PUBLIC_SITE_ORIGIN}/free-audit`,
    anchor: "start with a free brand audit",
    hint: "Primary audit conversion link",
  },
  {
    id: "strategy-session",
    label: "Strategy Session",
    url: `${PUBLIC_SITE_ORIGIN}/brand-strategy-session`,
    anchor: "book a brand strategy session",
    hint: "High-intent booking link",
  },
  {
    id: "the-brief",
    label: "The Brief Hub",
    url: `${PUBLIC_SITE_ORIGIN}/the-brief`,
    anchor: "read more from The Brief",
    hint: "Blog hub link",
  },
];

function blogPathSegment(post: BlogPost): string {
  return (post.slug?.trim() || post.id || "").replace(/^\/+|\/+$/g, "");
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(nodeToMarkdown).join("");
  const trimmedChildren = children.trim();

  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") return trimmedChildren ? `**${trimmedChildren}**` : "";
  if (tag === "em" || tag === "i") return trimmedChildren ? `*${trimmedChildren}*` : "";
  if (tag === "a") {
    const href = element.getAttribute("href");
    return href && trimmedChildren ? `[${trimmedChildren}](${href})` : children;
  }
  if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag.slice(1)))} ${trimmedChildren}\n\n`;
  if (tag === "p" || tag === "div" || tag === "section") return trimmedChildren ? `${trimmedChildren}\n\n` : "";
  if (tag === "blockquote") {
    return trimmedChildren
      ? `${trimmedChildren.split(/\n+/).map((line) => `> ${line.trim()}`).join("\n")}\n\n`
      : "";
  }
  if (tag === "ul") {
    return `${Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child) => `- ${nodeToMarkdown(child).trim()}`)
      .join("\n")}\n\n`;
  }
  if (tag === "ol") {
    return `${Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child, index) => `${index + 1}. ${nodeToMarkdown(child).trim()}`)
      .join("\n")}\n\n`;
  }
  if (tag === "li") return trimmedChildren;

  return children;
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.body.childNodes)
    .map(nodeToMarkdown)
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const BlogManagement = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [sharePost, setSharePost] = useState<BlogPost | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [contentValue, setContentValue] = useState("");
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [menuBusyPostId, setMenuBusyPostId] = useState<string | null>(null);

  // Form States
  const [categoryValue, setCategoryValue] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isHotTopic, setIsHotTopic] = useState(false);
  
  // New CMS Media States
  const [slugValue, setSlugValue] = useState("");
  const [excerptValue, setExcerptValue] = useState("");
  const [statusValue, setStatusValue] = useState<"draft" | "published">("draft");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState<"embed" | "upload" | null>(null);
  const [publishedDate, setPublishedDate] = useState<Date | undefined>(undefined);
  /** 24h wall-clock time interpreted as US Eastern with the selected calendar day. */
  const [publishTimeEt, setPublishTimeEt] = useState("09:00");
  const [publishMode, setPublishMode] = useState<"publish_now" | "schedule">("publish_now");
  const [showScheduleFields, setShowScheduleFields] = useState(false);
  const [seoLinkTarget, setSeoLinkTarget] = useState(CORE_SEO_LINKS[0].id);
  const [seoAnchorText, setSeoAnchorText] = useState(CORE_SEO_LINKS[0].anchor);
  const [customSeoUrl, setCustomSeoUrl] = useState("");

  const briefLinkOptions = useMemo(() => {
    return blogPosts
      .filter((post) => post.id && post.id !== selectedPost?.id && !post.is_hidden && (post.status ?? "published") === "published")
      .slice(0, 8)
      .map((post) => ({
        id: `brief:${post.id}`,
        label: `Brief: ${post.title}`,
        url: `${PUBLIC_SITE_ORIGIN}/the-brief/${encodeURIComponent(blogPathSegment(post))}`,
        anchor: post.title,
        hint: "Related article link",
      }));
  }, [blogPosts, selectedPost?.id]);

  const seoLinkOptions = useMemo(() => [...CORE_SEO_LINKS, ...briefLinkOptions], [briefLinkOptions]);

  const selectedSeoLink = seoLinkOptions.find((option) => option.id === seoLinkTarget);

  const seoLinkStats = useMemo(() => {
    const markdownLinks = contentValue.match(/\[[^\]]+\]\((https?:\/\/|\/)[^)]+\)/g) ?? [];
    const externalLinks = markdownLinks.filter((link) => !/https?:\/\/(www\.)?jahknowspr\.com/i.test(link) && !link.includes("](/"));
    return {
      totalLinks: markdownLinks.length,
      externalLinks: externalLinks.length,
      hasFreeAudit: contentValue.includes("/free-audit"),
      hasStrategySession: contentValue.includes("/brand-strategy-session"),
      hasRelatedBrief: /\/the-brief\/[^)\s]+/.test(contentValue),
    };
  }, [contentValue]);

  const fetchBlogPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching blog posts:", error);
      toast({
        title: "Error",
        description: "Could not fetch blog posts.",
        variant: "destructive",
      });
    } else {
      setBlogPosts(data as BlogPost[]);
    }
  }, [toast]);

  useEffect(() => {
    fetchBlogPosts();
  }, [fetchBlogPosts]);

  const handleEdit = (post: BlogPost) => {
    setSelectedPost(post);
    setContentValue(post.content || "");
    setCategoryValue(post.category || "");
    setIsCustomCategory(false);
    setIsFeatured(!!post.is_featured);
    setIsHotTopic(!!post.is_hot_topic);
    // New CMS fields
    setSlugValue(post.slug || "");
    setExcerptValue(post.excerpt || "");
    setStatusValue(post.status || "draft");
    setCoverImageUrl(post.cover_image_url || "");
    setGalleryImageUrls(post.gallery_image_urls || []);
    setVideoUrl(post.video_url || "");
    setVideoType(post.video_type || null);
    if (post.publish_scheduled_at) {
      const dt = DateTime.fromISO(post.publish_scheduled_at).setZone(BLOG_PUBLISH_TIMEZONE);
      setPublishedDate(new Date(dt.year, dt.month - 1, dt.day));
      setPublishTimeEt(dt.toFormat("HH:mm"));
      setPublishMode("schedule");
      setShowScheduleFields(true);
    } else if (post.published_date) {
      const d = DateTime.fromFormat(
        post.published_date.slice(0, 10),
        "yyyy-MM-dd",
        { zone: BLOG_PUBLISH_TIMEZONE }
      );
      setPublishedDate(new Date(d.year, d.month - 1, d.day));
      setPublishTimeEt("00:00");
      setPublishMode("publish_now");
      setShowScheduleFields(false);
    } else {
      const t = DateTime.now().setZone(BLOG_PUBLISH_TIMEZONE);
      setPublishedDate(new Date(t.year, t.month - 1, t.day));
      setPublishTimeEt("09:00");
      setPublishMode("publish_now");
      setShowScheduleFields(false);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (postId: string) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .match({ id: postId });

      if (error) {
        toast({
          title: "Error Deleting Post",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Blog post deleted successfully.",
        });
        fetchBlogPosts(); // Refresh the list
      }
    }
  };

  const handleToggleHidden = async (post: BlogPost) => {
    const newHiddenStatus = !post.is_hidden;
    const { error } = await supabase
      .from("blog_posts")
      .update({ is_hidden: newHiddenStatus })
      .match({ id: post.id });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Blog post ${newHiddenStatus ? "hidden" : "visible"}.`,
      });
      fetchBlogPosts();
    }
  };

  const handleUpdateStatus = async (post: BlogPost, next: "draft" | "published") => {
    const id = post.id;
    if (!id) return;
    const current = post.status || "draft";
    if (current === next) return;

    setMenuBusyPostId(id);
    const { error } = await supabase
      .from("blog_posts")
      .update({
        status: next,
        published_at: next === "published" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Could not update status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: next === "published" ? "Post marked as published" : "Post reverted to draft",
      });
      fetchBlogPosts();
    }
    setMenuBusyPostId(null);
  };

  const handleMenuSetFeatured = async (post: BlogPost, featured: boolean) => {
    const id = post.id;
    if (!id) return;
    setMenuBusyPostId(id);
    if (featured) {
      const { error: clearErr } = await supabase
        .from("blog_posts")
        .update({ is_featured: false })
        .eq("is_featured", true);
      if (clearErr) {
        toast({
          title: "Could not update featured post",
          description: clearErr.message,
          variant: "destructive",
        });
        setMenuBusyPostId(null);
        return;
      }
      const { error } = await supabase
        .from("blog_posts")
        .update({ is_featured: true })
        .eq("id", id);
      if (error) {
        toast({
          title: "Could not set featured",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "This post is now the featured brief" });
        fetchBlogPosts();
      }
    } else {
      const { error } = await supabase
        .from("blog_posts")
        .update({ is_featured: false })
        .eq("id", id);
      if (error) {
        toast({
          title: "Could not remove featured",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Featured highlight removed" });
        fetchBlogPosts();
      }
    }
    setMenuBusyPostId(null);
  };

  const handleMenuToggleHot = async (post: BlogPost) => {
    const id = post.id;
    if (!id) return;
    setMenuBusyPostId(id);
    const next = !post.is_hot_topic;
    const { error } = await supabase
      .from("blog_posts")
      .update({ is_hot_topic: next })
      .eq("id", id);
    if (error) {
      toast({
        title: "Could not update hot topic",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: next ? "Added to hot topics" : "Removed from hot topics",
      });
      fetchBlogPosts();
    }
    setMenuBusyPostId(null);
  };

  const handleSeoLinkTargetChange = (target: string) => {
    setSeoLinkTarget(target);
    const option = seoLinkOptions.find((item) => item.id === target);
    if (option) {
      setSeoAnchorText(option.anchor);
    }
  };

  const insertSeoLink = () => {
    const url = seoLinkTarget === CUSTOM_LINK_TARGET ? customSeoUrl.trim() : selectedSeoLink?.url;
    const anchor = seoAnchorText.trim() || selectedSeoLink?.anchor || "learn more";

    if (!url) {
      toast({
        title: "Add a URL first",
        description: "Choose a destination or paste a custom URL.",
        variant: "destructive",
      });
      return;
    }

    if (!/^https?:\/\/|^\//.test(url)) {
      toast({
        title: "Use a clean URL",
        description: "Links should start with https:// or /.",
        variant: "destructive",
      });
      return;
    }

    const markdownLink = `[${anchor}](${url})`;
    const separator = contentValue.trim().length > 0 ? "\n\n" : "";
    setContentValue(`${contentValue}${separator}${markdownLink}`);
    toast({
      title: "SEO link inserted",
      description: `${anchor} → ${url}`,
    });
  };

  const handleEditorPasteCapture = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const html = event.clipboardData.getData("text/html");
    if (!html.trim()) return;

    const markdown = htmlToMarkdown(html);
    if (!markdown.trim()) return;

    event.preventDefault();
    const textarea =
      editorContainerRef.current?.querySelector("textarea") ||
      (document.activeElement instanceof HTMLTextAreaElement ? document.activeElement : null);
    const start = textarea?.selectionStart ?? contentValue.length;
    const end = textarea?.selectionEnd ?? contentValue.length;
    const prefix = contentValue.slice(0, start);
    const suffix = contentValue.slice(end);
    const needsLeadingBreak = prefix.trim().length > 0 && !prefix.endsWith("\n\n") ? "\n\n" : "";
    const needsTrailingBreak = suffix.trim().length > 0 && !markdown.endsWith("\n\n") ? "\n\n" : "";
    const insertion = `${needsLeadingBreak}${markdown}${needsTrailingBreak}`;

    setContentValue(`${prefix}${insertion}${suffix}`);
    window.requestAnimationFrame(() => {
      if (!textarea) return;
      const cursor = start + insertion.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    
    // Auto-generate slug if not provided
    const finalSlug = slugValue.trim() || generateSlug(title);

    const nowEt = DateTime.now().setZone(BLOG_PUBLISH_TIMEZONE);
    const scheduleDay = publishedDate ?? new Date(nowEt.year, nowEt.month - 1, nowEt.day);
    const effectiveTime = publishMode === "publish_now" ? nowEt.toFormat("HH:mm") : publishTimeEt;
    const { publishScheduledAt, publishedDateYmd } = buildPublishScheduledAtIso(scheduleDay, effectiveTime);
    const effectiveStatus: "draft" | "published" =
      publishMode === "schedule" || publishMode === "publish_now" ? "published" : statusValue;
    
    const postData: Partial<BlogPost> = {
      title,
      slug: finalSlug,
      excerpt: excerptValue || null,
      tagline: formData.get("tagline") as string,
      description: formData.get("description") as string,
      content: contentValue,
      category: categoryValue,
      read_time: formData.get("read_time") as string,
      author_name: formData.get("author_name") as string,
      video_url: videoUrl || null,
      video_type: videoType,
      cover_image_url: coverImageUrl || null,
      gallery_image_urls: galleryImageUrls.length > 0 ? galleryImageUrls : null,
      status: effectiveStatus,
      published_at: effectiveStatus === "published" && publishMode === "publish_now" ? new Date().toISOString() : null,
      tags: (formData.get("tags") as string)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      published_date: publishedDateYmd,
      publish_scheduled_at: publishMode === "schedule" ? publishScheduledAt : null,
      is_featured: isFeatured,
      is_hot_topic: isHotTopic,
      is_hidden: selectedPost?.is_hidden ?? false,
      icon_name: 'Newspaper',
    };

    setIsSaving(true);

    if (isFeatured) {
      const { error: clearFeaturedError } = await supabase
        .from("blog_posts")
        .update({ is_featured: false })
        .eq("is_featured", true);
      if (clearFeaturedError) {
        toast({
          title: "Could not clear other featured posts",
          description: clearFeaturedError.message,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
    }

    let error: PostgrestError | null = null;
    let targetBlogPostId: string | null = selectedPost?.id || null;

    if (selectedPost && selectedPost.id) {
      // Update existing post
      const { error: updateError } = await supabase
        .from("blog_posts")
        .update(postData as any)
        .match({ id: selectedPost.id });
      error = updateError;
      targetBlogPostId = selectedPost.id;
    } else {
      // Create new post
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        (postData as any).author_id = user.id;
        const { data: inserted, error: insertError } = await supabase
          .from("blog_posts")
          .insert(postData as any)
          .select("id")
          .single();
        error = insertError;
        targetBlogPostId = inserted?.id || null;
      } else {
        toast({ title: "Error", description: "You must be logged in to create a post.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
    }

    if (error) {
      toast({
        title: "Error Saving Post",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Blog post ${
          selectedPost ? "updated" : "created"
        } successfully.`,
      });

      // Blog scheduling is now controlled from Blog Management (not Content Calendar)
      if (targetBlogPostId && publishMode === "schedule") {
        const { data: mainCalendar, error: calError } = await supabase
          .from("content_calendars")
          .select("id")
          .eq("calendar_type", "jahknowspr")
          .limit(1)
          .maybeSingle();

        if (!calError && mainCalendar?.id) {
          // Replace prior schedule entry for this blog post (if any)
          await supabase.from("scheduled_posts").delete().eq("blog_post_id", targetBlogPostId);
          const { error: schedErr } = await supabase.from("scheduled_posts").insert({
            calendar_id: mainCalendar.id,
            caption: `Blog: ${title}`,
            platforms: [],
            scheduled_date: publishedDateYmd,
            scheduled_time: effectiveTime,
            status: "scheduled",
            post_type: "blog",
            blog_post_id: targetBlogPostId,
          });

          if (schedErr) {
            toast({
              title: "Blog saved, calendar schedule failed",
              description: schedErr.message,
              variant: "destructive",
            });
          }
        }
      }

      setIsDialogOpen(false);
      setSelectedPost(null);
      fetchBlogPosts(); // Refresh the list
    }
    setIsSaving(false);
  };

  const openNewPostDialog = () => {
    setSelectedPost(null);
    setContentValue("");
    setCategoryValue("");
    setIsCustomCategory(false);
    setIsFeatured(false);
    setIsHotTopic(false);
    // Reset new CMS fields
    setSlugValue("");
    setExcerptValue("");
    setStatusValue("draft");
    setCoverImageUrl("");
    setGalleryImageUrls([]);
    setVideoUrl("");
    setVideoType(null);
    {
      const t = DateTime.now().setZone(BLOG_PUBLISH_TIMEZONE);
      setPublishedDate(new Date(t.year, t.month - 1, t.day));
    }
    setPublishTimeEt("09:00");
    setPublishMode("publish_now");
    setShowScheduleFields(false);
    setIsDialogOpen(true);
  };

  // Filter posts based on search term and category
  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "" || post.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(blogPosts.map(post => post.category).filter(Boolean))) as string[];

  /** Options for the edit dialog Select: include current value even if not yet in any saved post. */
  const categorySelectOptions = useMemo(() => {
    const fromPosts = Array.from(
      new Set(blogPosts.map((p) => p.category).filter(Boolean)),
    ) as string[];
    if (categoryValue && !fromPosts.includes(categoryValue)) {
      return [categoryValue, ...fromPosts];
    }
    return fromPosts;
  }, [blogPosts, categoryValue]);

  const NEW_CATEGORY_SENTINEL = "__KORA_NEW_CATEGORY__";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Blog Management</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage your blog posts with ease
          </p>
        </div>
        <Button 
          onClick={openNewPostDialog}
          className="shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Post
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Posts</p>
                <p className="text-2xl font-bold text-primary">{blogPosts.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Categories</p>
                <p className="text-2xl font-bold text-primary">{categories.length}</p>
              </div>
              <Tag className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">This Month</p>
                <p className="text-2xl font-bold text-primary">
                  {blogPosts.filter(post => {
                    if (!post.created_at) return false;
                    const postDate = new Date(post.created_at);
                    const now = new Date();
                    return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Filtered</p>
                <p className="text-2xl font-bold text-primary">{filteredPosts.length}</p>
              </div>
              <Search className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-10 pr-8 py-2 border rounded-md bg-background focus:ring-2 focus:ring-ring text-sm min-w-[160px]"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category || ""}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3">
                        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-lg font-medium text-muted-foreground">No posts found</p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm || filterCategory ? 'Try adjusting your search filters' : 'Create your first blog post to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => {
                    const scheduleLabel = formatBlogPublishScheduleDisplay({
                      publishedDate: post.published_date,
                      publishScheduledAt: post.publish_scheduled_at,
                    });
                    const isLive = isBlogPostPubliclyLive({
                      publishedDate: post.published_date,
                      publishScheduledAt: post.publish_scheduled_at,
                      status: post.status,
                      isHidden: post.is_hidden,
                    });
                    return (
                    <TableRow key={post.id} className="group">
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {post.title}
                          </p>
                          {post.tagline && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {post.tagline}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.category && (
                          <Badge variant="secondary" className="font-normal">
                            {post.category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {!post.is_hidden &&
                            (isLive ? (
                              <Badge
                                variant="outline"
                                className="rounded-full text-[10px] px-2 py-0 h-5 border-emerald-200 bg-emerald-50 text-emerald-800"
                              >
                                Live
                              </Badge>
                            ) : scheduleLabel ? (
                              <Badge
                                variant="outline"
                                className="rounded-full text-[10px] px-2 py-0.5 min-h-[22px] h-auto max-w-[200px] whitespace-normal text-left leading-snug border-sky-200 bg-sky-50 text-sky-900"
                                title={scheduleLabel}
                              >
                                {scheduleLabel}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="rounded-full text-[10px] px-2 py-0 h-5 border-slate-300 bg-slate-100 text-slate-700"
                              >
                                Draft
                              </Badge>
                            ))}
                          {post.is_featured && (
                            <Badge variant="default" className="bg-accent text-accent-foreground border-accent text-[10px] px-1.5 py-0 h-5">
                              FEATURED
                            </Badge>
                          )}
                          {post.is_hot_topic && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px] px-1.5 py-0 h-5">
                              HOT
                            </Badge>
                          )}
                          {post.is_hidden && (
                            <Badge variant="outline" className="text-muted-foreground border-muted bg-muted/50 text-[10px] px-1.5 py-0 h-5">
                              <EyeOff className="h-3 w-3 mr-1" />
                              HIDDEN
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{post.author_name || 'Anonymous'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(post)}
                            className="h-8"
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background min-w-[12rem]">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setPreviewPost(post);
                                  setIsPreviewOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Preview Post
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!post.id}
                                onClick={() => {
                                  setSharePost(post);
                                  setIsShareOpen(true);
                                }}
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                Status
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                disabled={
                                  menuBusyPostId === post.id ||
                                  (post.status || "draft") === "published"
                                }
                                onClick={() => handleUpdateStatus(post, "published")}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as published
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  menuBusyPostId === post.id ||
                                  (post.status || "draft") === "draft"
                                }
                                onClick={() => handleUpdateStatus(post, "draft")}
                              >
                                <PenLine className="h-4 w-4 mr-2" />
                                Revert to draft
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                The Brief page
                              </DropdownMenuLabel>
                              {post.is_featured ? (
                                <DropdownMenuItem
                                  disabled={menuBusyPostId === post.id}
                                  onClick={() => handleMenuSetFeatured(post, false)}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Remove featured
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  disabled={menuBusyPostId === post.id}
                                  onClick={() => handleMenuSetFeatured(post, true)}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Set as featured
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                disabled={menuBusyPostId === post.id}
                                onClick={() => handleMenuToggleHot(post)}
                              >
                                <Flame className="h-4 w-4 mr-2" />
                                {post.is_hot_topic ? "Remove from hot topics" : "Add to hot topics"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleHidden(post)}
                              >
                                {post.is_hidden ? (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Show Post
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Hide Post
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(post.id!)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Post
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            setSelectedPost(null);
            setContentValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              {selectedPost ? "Edit Blog Post" : "Create New Blog Post"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-6 py-6 max-h-[calc(90vh-140px)] overflow-y-auto px-1">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    defaultValue={selectedPost?.title} 
                    required
                    placeholder="Enter post title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input 
                    id="slug" 
                    name="slug" 
                    value={slugValue}
                    onChange={(e) => setSlugValue(e.target.value)}
                    placeholder="auto-generated-from-title"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to auto-generate from title</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input 
                    id="tagline" 
                    name="tagline" 
                    defaultValue={selectedPost?.tagline || ""} 
                    placeholder="A compelling tagline"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={statusValue} 
                    onValueChange={(val) => setStatusValue(val as "draft" | "published")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Publish controls</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={publishMode === "schedule" ? "default" : "outline"}
                      onClick={() => {
                        setPublishMode("schedule");
                        setShowScheduleFields(true);
                        setStatusValue("published");
                      }}
                    >
                      Schedule Blog
                    </Button>
                    <Button
                      type="button"
                      variant={publishMode === "publish_now" ? "default" : "outline"}
                      onClick={() => {
                        setPublishMode("publish_now");
                        setShowScheduleFields(false);
                        setStatusValue("published");
                        const t = DateTime.now().setZone(BLOG_PUBLISH_TIMEZONE);
                        setPublishedDate(new Date(t.year, t.month - 1, t.day));
                        setPublishTimeEt(t.toFormat("HH:mm"));
                      }}
                    >
                      Publish
                    </Button>
                  </div>
                  {showScheduleFields && (
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !publishedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {publishedDate ? format(publishedDate, "PPP") : <span>Pick publish date (US Eastern)</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50 bg-background border shadow-lg" align="start" sideOffset={8}>
                          <Calendar
                            mode="single"
                            selected={publishedDate}
                            onSelect={setPublishedDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        id="publish_time_et"
                        type="time"
                        value={publishTimeEt}
                        onChange={(e) => setPublishTimeEt(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Scheduled posts are created here and automatically appear in Content Calendar.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea 
                  id="excerpt" 
                  name="excerpt" 
                  value={excerptValue}
                  onChange={(e) => setExcerptValue(e.target.value)}
                  className="min-h-[60px]"
                  placeholder="Short excerpt for listings (optional)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  defaultValue={selectedPost?.description || ""} 
                  className="min-h-[80px]"
                  placeholder="Brief description for SEO and previews"
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                {!isCustomCategory ? (
                  <Select 
                    value={categoryValue || undefined}
                    onValueChange={(val) => {
                      if (val === NEW_CATEGORY_SENTINEL) {
                        setIsCustomCategory(true);
                        setCategoryValue("");
                      } else {
                        setCategoryValue(val);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorySelectOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_CATEGORY_SENTINEL} className="font-medium text-primary">
                        + Create New Category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      value={categoryValue}
                      onChange={(e) => setCategoryValue(e.target.value)}
                      placeholder="Enter new category name"
                      autoFocus
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        setIsCustomCategory(false);
                        setCategoryValue("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Image className="h-4 w-4" />
                Cover Image
              </h3>
              <ImageUploader
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                label="Upload Cover Image"
              />
            </div>

            {/* Gallery Images */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Image className="h-4 w-4" />
                Gallery Images
              </h3>
              <GalleryUploader
                value={galleryImageUrls}
                onChange={setGalleryImageUrls}
                maxImages={10}
              />
            </div>

            {/* Video Section */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video
              </h3>
              <VideoUploader
                videoUrl={videoUrl}
                videoType={videoType}
                onVideoChange={(url, type) => {
                  setVideoUrl(url);
                  setVideoType(type);
                }}
              />
            </div>

            {/* Brief highlights (optional) */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                The Brief page (optional)
              </h3>
              <p className="text-sm text-muted-foreground">
                Featured appears as the hero at the top (only one at a time). Hot topics appear in a strip below it. All other live briefs follow in the main grid.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3 space-y-0">
                  <Checkbox
                    id="is_featured_form"
                    checked={isFeatured}
                    onCheckedChange={(checked) => setIsFeatured(checked === true)}
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor="is_featured_form"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Featured brief
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Main hero on The Brief. Choosing this clears featured from other posts when you save.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0">
                  <Checkbox
                    id="is_hot_topic_form"
                    checked={isHotTopic}
                    onCheckedChange={(checked) => setIsHotTopic(checked === true)}
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor="is_hot_topic_form"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Hot topic
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Shown in the hot-topics strip under the featured post (any number of posts).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Content
              </h3>
              <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Link2 className="h-4 w-4 text-gold" />
                      Smart SEO Link Assistant
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Insert useful internal links and backlink-ready external URLs with descriptive anchor text.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="seo-link-target">Destination</Label>
                    <Select value={seoLinkTarget} onValueChange={handleSeoLinkTargetChange}>
                      <SelectTrigger id="seo-link-target">
                        <SelectValue placeholder="Choose a link destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {CORE_SEO_LINKS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label} — {option.hint}
                          </SelectItem>
                        ))}
                        {briefLinkOptions.length > 0 ? (
                          <>
                            {briefLinkOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </>
                        ) : null}
                        <SelectItem value={CUSTOM_LINK_TARGET}>Custom external URL / backlink</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-anchor-text">Anchor text</Label>
                    <Input
                      id="seo-anchor-text"
                      value={seoAnchorText}
                      onChange={(event) => setSeoAnchorText(event.target.value)}
                      placeholder="Use natural, keyword-aware anchor text"
                    />
                  </div>

                  <Button type="button" onClick={insertSeoLink} className="lg:mb-0">
                    Insert SEO Link
                  </Button>
                </div>

                {seoLinkTarget === CUSTOM_LINK_TARGET ? (
                  <div className="space-y-2">
                    <Label htmlFor="custom-seo-url">Custom URL</Label>
                    <Input
                      id="custom-seo-url"
                      value={customSeoUrl}
                      onChange={(event) => setCustomSeoUrl(event.target.value)}
                      placeholder="https://example.com/source-or-partner-page"
                    />
                  </div>
                ) : selectedSeoLink ? (
                  <p className="text-xs text-muted-foreground">
                    Link target: <span className="font-medium text-foreground">{selectedSeoLink.url}</span>
                  </p>
                ) : null}

                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-md bg-background p-2">
                    <span className="font-medium text-foreground">{seoLinkStats.totalLinks}</span> total markdown links
                  </div>
                  <div className="rounded-md bg-background p-2">
                    <span className="font-medium text-foreground">{seoLinkStats.externalLinks}</span> external/backlink references
                  </div>
                </div>
              </div>
              <div
                ref={editorContainerRef}
                data-color-mode="light"
                className="border rounded-md overflow-hidden"
                onPasteCapture={handleEditorPasteCapture}
              >
                <MDEditor
                  value={contentValue}
                  onChange={(value) => setContentValue(value || "")}
                  height={400}
                  preview="edit"
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Metadata
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="read_time">Read Time</Label>
                  <Input 
                    id="read_time" 
                    name="read_time" 
                    defaultValue={selectedPost?.read_time || ""} 
                    placeholder="e.g., 5 min read"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="author_name">Author</Label>
                  <Input 
                    id="author_name" 
                    name="author_name" 
                    defaultValue={selectedPost?.author_name || ""} 
                    placeholder="Author's name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input 
                  id="tags" 
                  name="tags" 
                  defaultValue={selectedPost?.tags?.join(", ") || ""} 
                  placeholder="react, javascript, tutorial"
                />
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 bg-background pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedPost ? "Update Post" : "Create Post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BlogShareDialog
        post={sharePost}
        open={isShareOpen}
        onOpenChange={(open) => {
          setIsShareOpen(open);
          if (!open) setSharePost(null);
        }}
      />

      {/* Preview Post Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Preview Post
            </DialogTitle>
          </DialogHeader>
          
          {previewPost && (
            <div className="space-y-6 py-4 max-h-[calc(90vh-180px)] overflow-y-auto">
              {/* Post Header */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {previewPost.category && (
                    <Badge variant="secondary">{previewPost.category}</Badge>
                  )}
                  {previewPost.is_featured && (
                    <Badge className="bg-accent text-accent-foreground">Featured</Badge>
                  )}
                  {previewPost.is_hot_topic && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                      Hot topic
                    </Badge>
                  )}
                  {previewPost.is_hidden && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Hidden
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-2xl font-bold text-primary">{previewPost.title}</h1>
                
                {previewPost.tagline && (
                  <p className="text-lg text-muted-foreground italic">{previewPost.tagline}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {previewPost.author_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {previewPost.author_name}
                    </span>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                        <CalendarIcon className="h-4 w-4" />
                        {previewPost.published_date 
                          ? new Date(previewPost.published_date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Select date'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={8}>
                      <Calendar
                        mode="single"
                        selected={previewPost.published_date ? new Date(previewPost.published_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setPublishedDate(date);
                            setPreviewPost(prev => prev ? { ...prev, published_date: date.toISOString() } : null);
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {previewPost.read_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {previewPost.read_time}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {previewPost.description && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-foreground">{previewPost.description}</p>
                </div>
              )}

              {/* Content Preview */}
              <div className="prose prose-sm max-w-none" data-color-mode="light">
                <MDEditor.Markdown source={previewPost.content || ''} />
              </div>

              {/* Tags */}
              {previewPost.tags && previewPost.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-4 border-t">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {previewPost.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {previewPost?.is_hidden && (
              <Button 
                onClick={async () => {
                  if (previewPost) {
                    await handleToggleHidden(previewPost);
                    setIsPreviewOpen(false);
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Publish Post
              </Button>
            )}
            {!previewPost?.is_hidden && (
              <Button 
                variant="secondary"
                onClick={async () => {
                  if (previewPost) {
                    await handleToggleHidden(previewPost);
                    setIsPreviewOpen(false);
                  }
                }}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogManagement;
