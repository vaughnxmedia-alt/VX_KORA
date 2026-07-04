import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, ArrowRight, X, User, Flame, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { deriveBriefHomepageLayout } from "@/lib/brief-homepage-promotion";
import { filterLiveBriefPosts } from "@/lib/brief-listing";
import { normalizeBlogPostCategory } from "@/lib/blog-categories";
import { useBlogCategories } from "@/hooks/useBlogCategories";
import {
  buildBlogPathSegment,
  getDefaultOgImageAbsoluteUrl,
  getPublicSiteOrigin,
} from "@/lib/blog-share";
import { answerPages } from "@/data/answerPages";
import { GUIDE_HUB_PATH } from "@/content/guides/beforeYouBuildTheBrand";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type BlogPost = {
  id: string;
  slug?: string | null;
  title: string;
  description: string;
  content: string;
  category: string;
  read_time: string;
  published_date: string;
  author_name: string;
  icon_name: string;
  tagline?: string;
  cover_image_url?: string;
  status?: string | null;
  is_hidden?: boolean | null;
  is_featured?: boolean | null;
  is_hot_topic?: boolean | null;
  publication_status?: string | null;
  promo_featured?: boolean | null;
  promo_editors_pick?: boolean | null;
  promo_trending?: boolean | null;
  promo_homepage_shuffle?: boolean | null;
  feature_priority?: number | null;
};

const updateTheBriefSEO = () => {
  document.title = "The Brief | JahKnowsPR";
  const description = "Strategic insights on brand intelligence, public relations, positioning, and influence for founders and organizations.";
  const canonicalUrl = `${getPublicSiteOrigin()}/the-brief`;
  const head = document.head;

  document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[data-seo="the-brief"]').forEach((tag) => tag.remove());

  const setMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
    let meta = document.querySelector(selector) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(attr, key);
      head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  };

  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[name="robots"]', "name", "robots", "index,follow,max-image-preview:large");

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = canonicalUrl;
  head.appendChild(canonical);

  [
    ["og:title", "The Brief | JahKnowsPR"],
    ["og:description", description],
    ["og:type", "website"],
    ["og:url", canonicalUrl],
    ["og:site_name", "JahKnowsPR"],
    ["og:image", getDefaultOgImageAbsoluteUrl()],
  ].forEach(([property, content]) => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", property);
    meta.setAttribute("content", content);
    head.appendChild(meta);
  });

  [
    ["twitter:card", "summary_large_image"],
    ["twitter:title", "The Brief | JahKnowsPR"],
    ["twitter:description", description],
    ["twitter:image", getDefaultOgImageAbsoluteUrl()],
  ].forEach(([name, content]) => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    head.appendChild(meta);
  });

  const structuredData = document.createElement("script");
  structuredData.type = "application/ld+json";
  structuredData.dataset.seo = "the-brief";
  structuredData.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The Brief",
    description,
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "JahKnowsPR Firm",
      url: getPublicSiteOrigin(),
    },
  });
  head.appendChild(structuredData);
};

const Blog = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showWelcome, setShowWelcome] = useState(false);
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 6;
  const { categories: managedCategories } = useBlogCategories();

  const fetchBlogPosts = useCallback(async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_hidden", false)
        .order("published_date", { ascending: false });

      if (error) {
          console.error("Error fetching blog posts:", error);
          toast({
              title: "Error",
              description: "Could not fetch blog posts.",
              variant: "destructive",
          });
      } else {
          setArticles((data as BlogPost[]).map((post) => ({
            ...post,
            category: normalizeBlogPostCategory(post.category),
          })));
      }
  }, [toast]);

  useEffect(() => {
    updateTheBriefSEO();
    fetchBlogPosts();
    
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(normalizeBlogPostCategory(categoryParam));
    }
    
    if (searchParams.get('new_access') === 'true') {
      setShowWelcome(true);
      searchParams.delete('new_access');
      setSearchParams(searchParams);
    }
  }, [fetchBlogPosts, searchParams, setSearchParams]);

  const liveArticles = useMemo(() => filterLiveBriefPosts(articles), [articles]);

  const categories = useMemo(() => {
    const publishedCategoryNames = new Set(
      liveArticles.map((article) => article.category).filter(Boolean),
    );
    const activeFilters = managedCategories
      .filter((category) => category.is_active && publishedCategoryNames.has(category.name))
      .map((category) => category.name);
    return ["All", ...activeFilters];
  }, [managedCategories, liveArticles]);

  const featuredInsightCategories = useMemo(
    () =>
      managedCategories
        .filter((category) => category.is_active && category.featured_insights_eligible)
        .map((category) => category.name),
    [managedCategories],
  );

  const { editorsPick, featuredInsights, trendingArticles, gridArticles } = useMemo(
    () =>
      deriveBriefHomepageLayout(articles, featuredInsightCategories, selectedCategory),
    [articles, featuredInsightCategories, selectedCategory],
  );
  const isAllCategory = selectedCategory === "All";

  const totalPages = Math.ceil(gridArticles.length / articlesPerPage);
  const paginatedArticles = gridArticles.slice(
    (currentPage - 1) * articlesPerPage,
    currentPage * articlesPerPage
  );

  const handleCategoryClick = (category: string) => {
    if (category === "Educational Series") {
      setSelectedCategory("All");
      setCurrentPage(1);
      setSearchParams({});
      setTimeout(() => {
        const element = document.getElementById("educational-series");
        element?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }
    setSelectedCategory(category);
    setCurrentPage(1);
    if (category === "All") {
      setSearchParams({});
    } else {
      setSearchParams({ category });
    }
    // Scroll to the briefs section
    setTimeout(() => {
      const element = document.getElementById('latest-insights');
      element?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      const element = document.getElementById('latest-insights');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderAnswersSection = () => (
    <section className="rounded-3xl border bg-muted/20 p-6 sm:p-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-4xl">
          Answers<span className="text-gold">.</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Start with these direct answer guides while new Brief articles are being added.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {answerPages.slice(0, 8).map((answer) => (
          <button
            key={answer.slug}
            type="button"
            onClick={() => navigate(`/answers/${answer.slug}`)}
            className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Answer</p>
            <h4 className="mt-3 text-lg font-bold leading-tight text-foreground group-hover:text-primary">
              {answer.title}
            </h4>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {answer.directAnswer}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Read answer <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  const openBriefPost = (article: BlogPost) => {
    navigate(`/the-brief/${encodeURIComponent(buildBlogPathSegment(article))}`);
  };

  const renderArticleMeta = (article: BlogPost) => (
    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-2">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4" />
        <span className="font-medium text-foreground">{article.author_name}</span>
      </div>
      <span>•</span>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span>{article.read_time}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      
      {showWelcome && (
        <Alert className="max-w-7xl mx-auto mx-4 sm:mx-6 lg:mx-auto my-4 sm:my-6 border-border/50 bg-muted/30">
          <AlertTitle className="font-bold flex justify-between items-center text-foreground">
            Welcome to The Brief.
            <Button variant="ghost" size="sm" onClick={() => setShowWelcome(false)} className="hover:bg-muted">
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            You now have access to The Brief. Explore our published thinking below.
          </AlertDescription>
        </Alert>
      )}

      {/* Modern Hero Section with Split Layout */}
      <section className="relative py-8 sm:py-12 lg:py-16 px-4 sm:px-6 overflow-hidden bg-secondary dark:bg-background border-b">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(45_70%_65%_/_0.08),transparent)]"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="mb-8 sm:mb-12">
           <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6 text-primary">
              The Brief<span className="text-gold">.</span>
            </h1>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
               <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Where our thinking lives before it becomes execution.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <Button 
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    onClick={() => handleCategoryClick(cat)}
                    className="rounded-full"
                    size="sm"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {editorsPick && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-gold" />
                <span className="text-xs sm:text-sm font-semibold text-gold tracking-widest uppercase">
                  Editor&apos;s Pick
                </span>
              </div>
              <div className="group cursor-pointer" onClick={() => openBriefPost(editorsPick)}>
                <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-muted relative mb-4 sm:mb-6 shadow-xl shadow-primary/10 dark:shadow-none aspect-[4/3] sm:aspect-[940/788] w-full">
                  {editorsPick.cover_image_url ? (
                    <img
                      src={editorsPick.cover_image_url}
                      alt={editorsPick.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/10" />
                  <Badge className="absolute top-3 left-3 sm:top-6 sm:left-6 text-xs sm:text-sm py-1 sm:py-1.5 px-2.5 sm:px-4 shadow-lg backdrop-blur-md bg-background/90 text-foreground hover:bg-background/100 z-10 border-gold/30">
                    {editorsPick.category}
                  </Badge>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-[1.1] text-primary group-hover:text-gold-dark transition-colors">
                    {editorsPick.title}
                  </h2>
                  <p className="text-base sm:text-lg text-muted-foreground line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl">
                    {editorsPick.description}
                  </p>
                  {renderArticleMeta(editorsPick)}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {isAllCategory && featuredInsights.some((slot) => slot.article) && (
        <section className="py-10 sm:py-14 px-4 sm:px-6 border-b bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 sm:mb-10 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-gold" />
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-dark">
                  Featured Insights
                </p>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-primary">
                One standout from each lane<span className="text-gold">.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 sm:gap-6">
              {featuredInsights.map((slot) => (
                <div key={slot.category} className="min-h-[280px]">
                  {slot.article ? (
                    <div
                      className="group h-full cursor-pointer rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                      onClick={() => openBriefPost(slot.article!)}
                    >
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted relative mb-4">
                        {slot.article.cover_image_url ? (
                          <img
                            src={slot.article.cover_image_url}
                            alt={slot.article.title}
                            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-muted" />
                        )}
                      </div>
                      <Badge variant="outline" className="mb-3 border-gold/30 text-gold-dark">
                        {slot.category}
                      </Badge>
                      <h3 className="text-base font-bold leading-tight text-primary group-hover:text-gold-dark line-clamp-3">
                        {slot.article.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {slot.article.description}
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
                      <div>
                        <p className="text-sm font-semibold text-primary">{slot.category}</p>
                        <p className="mt-2 text-xs text-muted-foreground">No live brief yet</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {trendingArticles.length > 0 && (
        <section className="py-8 sm:py-10 px-4 sm:px-6 bg-muted/30 border-y border-border/60">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif font-bold text-xl sm:text-2xl mb-6 sm:mb-8 flex items-center justify-center gap-3 text-center">
              <Flame className="h-6 w-6 text-orange-500 shrink-0" />
              <span className="text-primary">
                Trending<span className="text-gold">.</span>
              </span>
            </h2>
            <div className="max-w-3xl mx-auto divide-y divide-border/40">
              {trendingArticles.map((article, idx) => (
                <div
                  key={article.id}
                  className="group/item cursor-pointer flex gap-4 items-start py-4 first:pt-0 last:pb-0"
                  onClick={() => openBriefPost(article)}
                >
                  <span className="text-3xl font-serif font-bold text-gold/30 leading-none -mt-1 group-hover/item:text-gold/50 transition-colors w-8">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-2 h-5 border-gold/30 text-gold-dark bg-gold/10"
                      >
                        {article.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{article.read_time}</span>
                    </div>
                    <h3 className="font-bold text-base sm:text-lg leading-tight group-hover/item:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Briefs Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16" id="latest-insights">
        {paginatedArticles.length > 0 && (
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-center mb-8 sm:mb-12">
            {selectedCategory === 'All' ? <span className="text-primary">All briefs<span className="text-gold">.</span></span> : <span className="text-primary">{selectedCategory}<span className="text-gold">.</span></span>}
          </h2>
        )}

        {paginatedArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {paginatedArticles.map((article) => (
                <div 
                  key={article.id}
                  className="group cursor-pointer"
                  onClick={() => openBriefPost(article)}
                >
                  <div className="aspect-[4/3] sm:aspect-[940/788] rounded-xl sm:rounded-2xl overflow-hidden bg-muted/30 relative mb-3 sm:mb-4 border shadow-sm group-hover:shadow-md transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/5 group-hover:scale-105 transition-transform duration-500" />
                    
                    {article.cover_image_url ? (
                      <img
                        src={article.cover_image_url}
                        alt={article.title}
                        className="absolute inset-0 object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted" />
                    )}
                    
                    <Badge className="absolute top-3 left-3 sm:top-4 sm:left-4 text-xs shadow-sm backdrop-blur-md bg-background/90 text-foreground hover:bg-background/100 border-gold/30">
                      {article.category}
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-primary group-hover:text-gold-dark transition-colors leading-tight mb-1.5 sm:mb-2">{article.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-2 sm:mb-0">{article.description}</p>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 sm:mt-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{article.read_time}</span>
                    </div>
                    <span>•</span>
                    <span>{new Date(article.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination className="mt-10 sm:mt-16">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : renderAnswersSection()}

        {isAllCategory && (
          <div id="educational-series" className="mt-12 scroll-mt-24 space-y-8 sm:mt-16">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-dark">Educational Series</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-primary sm:text-4xl">
                Build the foundation before you build the brand<span className="text-gold">.</span>
              </h2>
            </div>

            <section className="rounded-3xl border bg-[#F7F3EA] p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <Badge variant="outline" className="border-gold/40 text-gold-dark">The Perfect Startup</Badge>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-primary">Before the logo, before the launch, get the foundation right.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Browse JahKnowsPR's state-by-state startup education series for founders building with structure, clarity, and confidence.
                  </p>
                </div>
                <Button onClick={() => navigate("/the-brief/the-perfect-startup")} className="shrink-0">
                  Browse State Guides
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border bg-[#EAF3F7] p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <Badge variant="outline" className="border-sky-500/40 text-sky-700">The Making of a Brand</Badge>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-primary">Before the audience grows, make the brand clear.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Read the JahKnowsPR brand-building series for founders shaping their presence, message, trust signals, and digital foundation.
                  </p>
                </div>
                <Button onClick={() => navigate(GUIDE_HUB_PATH)} className="shrink-0">
                  Browse Brand Guides
                </Button>
              </div>
            </section>

            {renderAnswersSection()}
          </div>
        )}
      </div>

      <section className="border-t bg-muted/20 px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-dark">Next Step</p>
          <h2 className="font-serif text-3xl font-bold text-primary">Turn the insight into a diagnosis.</h2>
          <p className="max-w-2xl text-muted-foreground">
            Read the thinking, then diagnose where your brand is losing clarity before you push for more visibility.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate("/free-audit")}>Start Free Audit</Button>
            <Button variant="outline" onClick={() => navigate("/brand-strategy-session")}>
              Book Strategy Session
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Blog;
