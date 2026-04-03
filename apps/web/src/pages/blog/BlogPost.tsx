import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2, Bookmark, Eye, Heart, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MDEditor from '@uiw/react-md-editor';
import { useToast } from "@/components/ui/use-toast";
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSanitize from "rehype-sanitize";

type BlogPostType = {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  description: string;
  content: string;
  category: string;
  read_time: string;
  published_date: string;
  author_name: string;
  is_featured?: boolean | null;
  icon_name: string;
  tagline?: string;
  view_count?: number;
  cover_image_url?: string;
  gallery_image_urls?: string[];
  video_url?: string;
  video_type?: "embed" | "upload" | null;
};

// Comprehensive SEO function for individual blog post
const updateBlogPostSEO = (post: BlogPostType) => {
  // Title tag
  document.title = `${post.title} | The Brief - Expert Brand Strategy Insights`;
  
  // Meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', post.description || `${post.title} - Strategic insights on brand intelligence and public relations from JahKnowsPR.`);
  }
  
  // Remove existing meta tags
  const existingTags = document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]');
  existingTags.forEach(tag => tag.remove());
  
  const head = document.head;
  
  // Canonical URL
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = window.location.href;
  head.appendChild(canonical);
  
  // Open Graph tags
  const ogTags = [
    { property: 'og:title', content: post.title },
    { property: 'og:description', content: post.description },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: window.location.href },
    { property: 'og:site_name', content: 'The Brief' },
    { property: 'og:image', content: post.cover_image_url || `${window.location.origin}/logo.svg` },
    { property: 'og:image:width', content: '940' },
    { property: 'og:image:height', content: '788' },
    { property: 'og:image:alt', content: post.title },
    { property: 'article:author', content: post.author_name },
    { property: 'article:published_time', content: post.published_date },
    { property: 'article:section', content: post.category },
    { property: 'article:tag', content: 'brand strategy, marketing, business growth' }
  ];
  
  ogTags.forEach(tag => {
    const meta = document.createElement('meta');
    meta.setAttribute('property', tag.property);
    meta.setAttribute('content', tag.content);
    head.appendChild(meta);
  });
  
  // Twitter Card tags
  const twitterTags = [
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: post.title },
    { name: 'twitter:description', content: post.description },
    { name: 'twitter:creator', content: '@jahknowspr' },
    { name: 'twitter:image', content: post.cover_image_url || `${window.location.origin}/logo.svg` },
    { name: 'twitter:image:alt', content: post.title }
  ];
  
  twitterTags.forEach(tag => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', tag.name);
    meta.setAttribute('content', tag.content);
    head.appendChild(meta);
  });
  
  // Structured Data (JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "author": {
      "@type": "Person",
      "name": post.author_name,
      "jobTitle": "Senior Brand Strategist"
    },
    "publisher": {
      "@type": "Organization",
      "name": "JahKnowsPR",
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/favicon.ico`
      }
    },
    "datePublished": post.published_date,
    "dateModified": post.published_date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": window.location.href
    },
    "articleSection": post.category,
    "keywords": "brand strategy, marketing, business growth, content creation",
    "wordCount": post.content.split(' ').length,
    "timeRequired": post.read_time
  };
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  head.appendChild(script);
};

// Helper function to convert video URLs to embed URLs
const getEmbedUrl = (url: string): string | null => {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  return null;
};

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const location = useLocation();

  const incrementViewCount = useCallback(async (postId: string) => {
    const viewKey = `blog_view_${postId}`;
    const lastView = localStorage.getItem(viewKey);
    const now = Date.now();

    // Only increment if not viewed in last 24 hours
    if (lastView && now - parseInt(lastView) < 86400000) return;

    try {
      await supabase.rpc('increment_view_count', { post_id: postId });
      localStorage.setItem(viewKey, now.toString());
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  }, []);

  const fetchBlogPost = useCallback(async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching blog post:", error);
      const notFound =
        error.code === "PGRST116" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("no rows"));
      toast({
        title: notFound ? "Not available yet" : "Error",
        description: notFound
          ? "This article isn’t live yet, may be scheduled for a future date, or isn’t on The Brief."
          : "Could not fetch blog post.",
        variant: "destructive",
      });
      navigate("/the-brief");
    } else {
      setPost(data as BlogPostType);
      incrementViewCount(id);
    }
    setLoading(false);
  }, [id, navigate, toast, incrementViewCount]);

  useEffect(() => {
    if (id) {
      fetchBlogPost();
    }
  }, [id, fetchBlogPost]);

  const fetchRelatedPosts = useCallback(async () => {
    if (!post) return;
    
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("category", post.category)
      .neq("id", post.id)
      .limit(3);

    if (data) {
      setRelatedPosts(data as BlogPostType[]);
    }
  }, [post]);

  useEffect(() => {
    if (post) {
      updateBlogPostSEO(post);
      fetchRelatedPosts();

      if (location.hash) {
        const id = location.hash.substring(1);
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }, [post, location.hash, fetchRelatedPosts]);

   // Generate shareable URL that works with social media crawlers
   const getShareableUrl = () => {
     if (!post) return window.location.href;
     // Use the OG meta edge function URL for social sharing
     return `https://cjgqicpuwbflypcnhuak.supabase.co/functions/v1/og-meta?id=${post.id}`;
   };
 
  // Social sharing functions
  const shareToTwitter = () => {
    if (!post) return;
    const text = `${post.title} - ${post.description}`;
    const url = getShareableUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&via=jahmedia`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareToLinkedIn = () => {
    if (!post) return;
    const url = getShareableUrl();
    const title = post.title;
    const summary = post.description;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  const shareToFacebook = () => {
    if (!post) return;
    const url = getShareableUrl();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareToThreads = () => {
    if (!post) return;
    const text = `${post.title} - ${post.description}`;
    const url = getShareableUrl();
    const threadsUrl = `https://threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`;
    window.open(threadsUrl, '_blank', 'width=600,height=400');
  };

  const shareToInstagram = () => {
    // Instagram doesn't have a direct share URL, so we copy to clipboard and open Instagram
    if (!post) return;
    navigator.clipboard.writeText(`${post.title}\n\n${post.description}\n\n${getShareableUrl()}`);
    toast({
      title: "Content copied!",
      description: "Post content copied. Opening Instagram...",
    });
    window.open('https://instagram.com', '_blank');
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Removed from likes" : "Added to likes",
      description: isLiked ? "Article removed from your liked posts" : "Article added to your liked posts",
    });
  };

  const handleSave = () => {
    if (!post) return;
    const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
    
    if (isSaved) {
      const filteredPosts = savedPosts.filter((savedId: string) => savedId !== post.id);
      localStorage.setItem('savedPosts', JSON.stringify(filteredPosts));
      setIsSaved(false);
      toast({
        title: "Removed from saved",
        description: "Article removed from your saved posts",
      });
    } else {
      savedPosts.push(post.id);
      localStorage.setItem('savedPosts', JSON.stringify(savedPosts));
      setIsSaved(true);
      toast({
        title: "Saved successfully",
        description: "Article saved to your reading list",
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareableUrl());
      toast({
        title: "Link copied",
        description: "Shareable link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  // Check if post is saved on load
  useEffect(() => {
    if (post) {
      const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      setIsSaved(savedPosts.includes(post.id));
    }
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Article Not Found</h1>
          <Button onClick={() => navigate("/the-brief")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to The Brief
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background blog-editorial">
      {/* Header Navigation */}
      <div className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[680px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/the-brief")}
              className="text-muted-foreground hover:text-primary transition-smooth font-medium -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to The Brief
            </Button>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyToClipboard}
                className="hover:text-primary transition-smooth"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Share</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSave}
                className={`hover:text-primary transition-smooth ${isSaved ? 'text-primary' : ''}`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image with Gradient Overlay */}
      {post.cover_image_url && (
        <div className="relative w-full h-[400px] md:h-[480px] overflow-hidden">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      )}

      {/* Main Content Area */}
      <article className={`relative ${post.cover_image_url ? '-mt-32' : 'pt-16'}`}>
        
        {/* Article Header */}
        <header className="blog-editorial-container text-center mb-16 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Badge 
              variant="secondary" 
              className="font-medium text-sm px-4 py-1.5 bg-background border shadow-sm hover:bg-primary/5 transition-colors cursor-pointer"
              onClick={() => navigate(`/the-brief?category=${encodeURIComponent(post.category)}`)}
            >
              {post.category}
            </Badge>
            {post.is_featured && (
              <div className="flex items-center gap-1 text-xs font-bold text-primary uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Featured
              </div>
            )}
          </div>

          <h1 className="blog-editorial-title font-bold mb-6">
            {post.title}
          </h1>

          {post.tagline && (
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-light max-w-xl mx-auto mb-10">
              {post.tagline}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground border-y border-border/50 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {post.author_name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">{post.author_name}</div>
                <div className="text-xs">Brand Strategist</div>
              </div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(post.published_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {post.read_time}
            </div>
          </div>
        </header>

        {/* Video Section */}
        {post.video_url && post.video_type && (
          <div className="blog-editorial-container mb-16">
            {post.video_type === "embed" ? (
              getEmbedUrl(post.video_url) ? (
                <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                  <iframe
                    src={getEmbedUrl(post.video_url) ?? ""}
                    className="w-full h-full"
                    allowFullScreen
                    title="Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unsupported embed URL.</p>
              )
            ) : (
              <video
                src={post.video_url}
                controls
                className="w-full aspect-video rounded-xl shadow-lg"
              />
            )}
          </div>
        )}

        {/* Article Body - Editorial Prose */}
        <div className="blog-editorial-container pb-12">
          <div className="prose prose-lg max-w-none blog-editorial-body
            prose-headings:font-serif prose-headings:text-primary prose-headings:font-bold prose-headings:tracking-tight
            prose-h1:text-3xl prose-h1:mb-8 prose-h1:mt-16 prose-h1:text-primary
            prose-h2:text-2xl prose-h2:mb-6 prose-h2:mt-14 prose-h2:text-primary
            prose-h3:text-xl prose-h3:mb-4 prose-h3:mt-10 prose-h3:text-primary
            prose-p:mb-7 prose-p:text-[hsl(220,20%,25%)]
            prose-a:text-primary prose-a:font-medium prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-primary/80 prose-a:transition-all
            prose-strong:text-foreground prose-strong:font-semibold
            prose-ul:mb-8 prose-ul:text-[hsl(220,20%,25%)] prose-li:mb-3
            prose-ol:mb-8 prose-ol:text-[hsl(220,20%,25%)]
            prose-blockquote:border-l-0 prose-blockquote:bg-transparent prose-blockquote:px-0 prose-blockquote:py-0 prose-blockquote:my-14 prose-blockquote:text-center prose-blockquote:not-italic
            prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-medium
            prose-img:rounded-xl prose-img:shadow-md prose-img:my-12 prose-img:w-full
            prose-hr:hidden
            " 
            data-color-mode="light">
            <MDEditor.Markdown 
              source={post.content} 
              rehypePlugins={[[rehypeSanitize], [rehypeSlug], [rehypeAutolinkHeadings, { behavior: 'prepend' }]]}
            />
          </div>

          {/* Gallery Section */}
          {post.gallery_image_urls && post.gallery_image_urls.length > 0 && (
            <div className="mt-16">
              <div className="blog-section-break">
                <span className="blog-section-break-dot" />
              </div>
              <h3 className="text-xl font-serif font-bold text-primary mb-8 text-center">Gallery</h3>
              <div className="grid grid-cols-2 gap-4">
                {post.gallery_image_urls.map((url, index) => (
                  <div key={index} className="aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <img
                      src={url}
                      alt={`Gallery image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Article End Treatment */}
          <div className="blog-article-end">
            <div className="flex items-center justify-center gap-4 text-muted-foreground/60">
              <span className="w-16 h-px bg-border" />
              <span className="text-xs uppercase tracking-widest font-medium">End</span>
              <span className="w-16 h-px bg-border" />
            </div>
          </div>

          {/* Article Footer Actions */}
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleLike} className={`gap-2 ${isLiked ? 'text-destructive border-destructive/20 bg-destructive/5' : ''}`}>
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave} className="gap-2">
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium">Share:</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={shareToTwitter} className="h-9 w-9 rounded-full hover:bg-primary/5 hover:text-primary" title="Share on X/Twitter">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                </Button>
                <Button variant="ghost" size="icon" onClick={shareToLinkedIn} className="h-9 w-9 rounded-full hover:bg-primary/5 hover:text-primary" title="Share on LinkedIn">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
                </Button>
                <Button variant="ghost" size="icon" onClick={shareToFacebook} className="h-9 w-9 rounded-full hover:bg-primary/5 hover:text-primary" title="Share on Facebook">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
                </Button>
                <Button variant="ghost" size="icon" onClick={shareToThreads} className="h-9 w-9 rounded-full hover:bg-primary/5 hover:text-primary" title="Share on Threads">
                  <span className="sr-only">Threads</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.022.88-.73 2.132-1.13 3.628-1.154l.257-.002c.606 0 1.173.042 1.708.125.02-.468.004-.95-.05-1.442-.182-1.69-.758-2.922-1.713-3.666-.912-.71-2.15-1.053-3.681-1.019-1.625.036-2.918.493-3.842 1.358-.951.89-1.453 2.14-1.49 3.716l-2.12-.047c.05-2.164.753-3.903 2.09-5.166 1.376-1.3 3.25-1.986 5.572-2.04 1.987-.044 3.676.452 5.02 1.474 1.406 1.07 2.212 2.676 2.457 4.907.065.602.087 1.193.065 1.77 1.753.702 3.004 1.86 3.605 3.235.8 1.83.746 4.537-1.467 6.703-1.855 1.818-4.16 2.666-7.474 2.69zm-.255-9.112c-1.963.037-3.196.658-3.09 2.108.048.654.396 1.182.98 1.557.625.402 1.453.57 2.253.525 1.622-.093 2.655-1.26 2.842-3.203-.932-.185-1.932-.27-2.985-.27v-.717z" /></svg>
                </Button>
                <Button variant="ghost" size="icon" onClick={shareToInstagram} className="h-9 w-9 rounded-full hover:bg-primary/5 hover:text-primary" title="Share on Instagram">
                  <span className="sr-only">Instagram</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
                </Button>
              </div>
            </div>
          </div>

        </div>
      </article>

      {/* Related Articles Section */}
      {relatedPosts.length > 0 && (
        <section className="py-20 bg-muted/20 border-t border-border">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-serif font-bold text-primary">Continue Reading<span className="text-gold">.</span></h2>
              <Button variant="link" onClick={() => navigate('/the-brief')} className="hidden sm:flex">View all articles <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <article 
                  key={relatedPost.id} 
                  className="group cursor-pointer"
                  onClick={() => navigate(`/the-brief/${relatedPost.id}`)}
                >
                 <div className="aspect-[940/788] rounded-xl overflow-hidden bg-muted/30 mb-4 relative shadow-sm">
                   {relatedPost.cover_image_url ? (
                     <img 
                       src={relatedPost.cover_image_url} 
                       alt={relatedPost.title}
                       className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                     />
                   ) : (
                     <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted dark:from-background dark:to-muted group-hover:scale-105 transition-transform duration-500" />
                   )}
                    <Badge variant="secondary" className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm">
                      {relatedPost.category}
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg font-bold text-primary mb-2 group-hover:text-gold-dark transition-colors line-clamp-2">
                    {relatedPost.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                    {relatedPost.description}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground font-medium">
                     <span>{relatedPost.author_name}</span>
                     <span className="mx-2">•</span>
                     <span>{relatedPost.read_time}</span>
                  </div>
                </article>
              ))}
            </div>
            
            <div className="mt-8 text-center sm:hidden">
               <Button variant="outline" onClick={() => navigate('/the-brief')}>View all articles</Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-4 bg-foreground text-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">Ready to execute<span className="text-gold">?</span></h2>
          <p className="text-background/80 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop guessing and start growing. Get your custom brand blueprint today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg" 
              onClick={() => navigate("/brand-blueprint")}
              className="text-lg px-8 py-6 font-bold rounded-full shadow-xl hover:scale-105 transition-transform"
            >
              Get Your Blueprint
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPost;
