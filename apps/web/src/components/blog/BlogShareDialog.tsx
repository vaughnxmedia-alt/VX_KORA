import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildBlogPublicUrlForShare,
  getDefaultOgImageAbsoluteUrl,
  isBlogPostPublishedForShare,
} from "@/lib/blog-share";
import { Link2, Facebook, Linkedin, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

type BlogPostRow = {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  excerpt?: string | null;
  cover_image_url?: string | null;
  status?: string | null;
  published_date?: string | null;
  is_hidden?: boolean | null;
};

type SocialAccountRow = {
  id: string;
  account_type: string;
  account_name: string;
  username: string | null;
  provider: string;
  status: string;
};

const PLATFORM_LABEL: Record<string, string> = {
  facebook_page: "Facebook Page",
  instagram_professional: "Instagram",
  linkedin_member: "LinkedIn",
  x_account: "X (Twitter)",
  youtube_channel: "YouTube",
  tiktok_account: "TikTok",
};

function SiXIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function BlogShareDialog({
  post,
  open,
  onOpenChange,
}: {
  post: BlogPostRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: orgMembership } = useQuery({
    queryKey: ["blog-share-org", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("organization_users")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: open && !!user?.id,
  });

  const { data: connectedAccounts = [] } = useQuery({
    queryKey: ["blog-share-social", orgMembership?.organization_id],
    queryFn: async () => {
      if (!orgMembership?.organization_id) return [];
      const { data, error } = await supabase
        .from("social_accounts")
        .select("id,account_type,account_name,username,provider,status")
        .eq("organization_id", orgMembership.organization_id)
        .eq("is_active", true)
        .in("status", ["connected"])
        .order("account_name");
      if (error) return [];
      return (data || []) as SocialAccountRow[];
    },
    enabled: open && !!orgMembership?.organization_id,
  });

  if (!post?.id) return null;

  const published = isBlogPostPublishedForShare(post);
  /** Live article URL on jahknowspr.com (/the-brief/slug-or-id), never the og-meta edge URL. */
  const shareUrl = buildBlogPublicUrlForShare({ id: post.id, slug: post.slug });
  const blurb = post.excerpt || post.description || post.title;
  const thumb =
    post.cover_image_url?.trim() || getDefaultOgImageAbsoluteUrl();

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: label });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not access clipboard.",
        variant: "destructive",
      });
    }
  };

  const openFacebook = (url: string) => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "width=600,height=520",
    );
  };

  const openLinkedIn = (url: string) => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      "_blank",
      "width=600,height=520",
    );
  };

  const openX = (url: string) => {
    const text = `${post.title} — ${blurb}`.slice(0, 240);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&via=jahmedia`,
      "_blank",
      "width=600,height=400",
    );
  };

  const handleAccountShare = (account: SocialAccountRow) => {
    const url = shareUrl;
    switch (account.account_type) {
      case "facebook_page":
        openFacebook(url);
        break;
      case "linkedin_member":
        openLinkedIn(url);
        break;
      case "x_account":
        openX(url);
        break;
      case "instagram_professional": {
        const block = `${post.title}\n\n${blurb}\n\n${url}`;
        void copyText("Caption + link copied for Instagram", block);
        window.open("https://www.instagram.com/", "_blank");
        break;
      }
      case "youtube_channel":
      case "tiktok_account":
        void copyText("Link copied — paste in app", url);
        break;
      default:
        void copyText("Link copied", url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share post</DialogTitle>
          <DialogDescription>
            {published
              ? "This is your live article link (jahknowspr.com/the-brief/…). Copy it for text, email, or social — same page readers see on the site."
              : "This post is not published yet. The link points to your site; previews and access work after you publish."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border bg-muted/30">
            <img
              src={thumb}
              alt=""
              className="aspect-[1.91/1] w-full object-cover max-h-40"
            />
            <div className="p-3 space-y-1">
              <p className="font-medium text-sm leading-snug line-clamp-2">{post.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{blurb}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            className="w-full justify-center gap-2"
            onClick={() =>
              copyText("Link copied — paste in Messages, text, or social", shareUrl)
            }
          >
            <Link2 className="h-4 w-4 shrink-0" />
            Copy link
          </Button>

          {connectedAccounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Connected accounts
              </p>
              <div className="flex flex-col gap-2">
                {connectedAccounts.map((acc) => (
                  <Button
                    key={acc.id}
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 h-auto py-2"
                    onClick={() => handleAccountShare(acc)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      {acc.account_type === "facebook_page" && (
                        <Facebook className="h-4 w-4 text-blue-600" />
                      )}
                      {acc.account_type === "instagram_professional" && (
                        <Instagram className="h-4 w-4 text-pink-600" />
                      )}
                      {acc.account_type === "linkedin_member" && (
                        <Linkedin className="h-4 w-4 text-sky-700" />
                      )}
                      {acc.account_type === "x_account" && <SiXIcon />}
                      {acc.account_type === "youtube_channel" && (
                        <span className="text-xs font-bold text-red-600">YT</span>
                      )}
                      {acc.account_type === "tiktok_account" && (
                        <span className="text-xs font-bold">TT</span>
                      )}
                      {![
                        "facebook_page",
                        "instagram_professional",
                        "linkedin_member",
                        "x_account",
                        "youtube_channel",
                        "tiktok_account",
                      ].includes(acc.account_type) && <Link2 className="h-4 w-4" />}
                    </span>
                    <span className="flex flex-col items-start text-left">
                      <span className="text-sm font-medium">
                        {PLATFORM_LABEL[acc.account_type] || acc.account_type}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {acc.account_name}
                        {acc.username ? ` · @${acc.username}` : ""}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {connectedAccounts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Connect Facebook, Instagram, LinkedIn, or X under Content Calendar to open share dialogs from here.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
