import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, ArrowRight, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  title: string;
  description: string;
  content: string;
  category: string;
  read_time: string;
  published_date: string;
  author_name: string;
  is_featured: boolean;
  is_hot_topic: boolean;
  icon_name: string;
  tagline?: string;
  cover_image_url?: string;
};

const updateTheBriefSEO = () => {
  document.title = "The Brief | JahKnowsPR";
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', 'Strategic insights on brand intelligence, public relations, and influence for founders and organizations.');
  }
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

  useEffect(() => {
    updateTheBriefSEO();
    fetchBlogPosts();
    
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    
    if (searchParams.get('new_access') === 'true') {
      setShowWelcome(true);
      searchParams.delete('new_access');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);
  
  const fetchBlogPosts = async () => {
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
          setArticles(data as BlogPost[]);
      }
  };

  const categories = ["All", "Hot Topic", ...Array.from(new Set(articles.map(a => a.category).filter(Boolean)))];

  const heroArticle = articles.find(a => a.is_featured) || articles[0];
  
  // In Focus (Hot Topics) - Filter based on category
  const inFocusArticles = articles
    .filter(a => a.is_hot_topic && a.id !== heroArticle?.id && (selectedCategory === "All" || a.category === selectedCategory))
    .slice(0, 5);

  const latestInsightsArticles = selectedCategory === "All" 
    ? articles.filter(a => a.id !== heroArticle?.id)
    : selectedCategory === "Hot Topic"
    ? articles.filter(article => article.is_hot_topic && article.id !== heroArticle?.id)
    : articles.filter(article => article.category === selectedCategory && article.id !== heroArticle?.id);

  const totalPages = Math.ceil(latestInsightsArticles.length / articlesPerPage);
  const paginatedArticles = latestInsightsArticles.slice(
    (currentPage - 1) * articlesPerPage,
    currentPage * articlesPerPage
  );

  const handleCategoryClick = (category: string) => {
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

          {heroArticle && (
             <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start">
              
              {/* Featured Article (Left - 7 cols) */}
              <div 
                className="lg:col-span-7 group cursor-pointer"
                onClick={() => navigate(`/the-brief/${heroArticle.id}`)}
              >
                <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-muted relative mb-4 sm:mb-6 shadow-xl shadow-primary/10 dark:shadow-none aspect-[4/3] sm:aspect-[940/788] w-full">
                  {/* Cover Image or Placeholder */}
                  {heroArticle.cover_image_url ? (
                    <img
                      src={heroArticle.cover_image_url}
                      alt={heroArticle.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted" />
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/10" />
                  
                  {/* Category Badge */}
                  <Badge className="absolute top-3 left-3 sm:top-6 sm:left-6 text-xs sm:text-sm py-1 sm:py-1.5 px-2.5 sm:px-4 shadow-lg backdrop-blur-md bg-background/90 text-foreground hover:bg-background/100 z-10 border-gold/30">
                    {heroArticle.category}
                  </Badge>
                </div>
                
                <div className="space-y-3 sm:space-y-4 pr-0 lg:pr-4">
                   <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-gold tracking-widest uppercase">
                        Featured
                      </span>
                   </div>

                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-[1.1] text-primary group-hover:text-gold-dark transition-colors">
                    {heroArticle.title}
                  </h2>
                  
                  <p className="text-base sm:text-lg text-muted-foreground line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl">
                    {heroArticle.description}
                  </p>
                  
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium text-foreground">{heroArticle.author_name}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{heroArticle.read_time}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* In Focus List (Right - 5 cols) */}
              <div className="lg:col-span-5 bg-background/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gold/20">
                 <h3 className="font-serif font-bold text-xl sm:text-2xl mb-4 sm:mb-6 flex items-center gap-3">
                   <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-gold"></span>
                    </span>
                   In Focus
                 </h3>
                 
                 <div className="space-y-4 sm:space-y-6">
                   {inFocusArticles.map((article, idx) => (
                     <div 
                       key={article.id} 
                       className="group/item cursor-pointer flex gap-4 items-start"
                        onClick={() => navigate(`/the-brief/${article.id}`)}
                     >
                       <span className="text-3xl font-serif font-bold text-gold/30 leading-none -mt-1 group-hover/item:text-gold/50 transition-colors w-8">
                         {String(idx + 1).padStart(2, '0')}
                       </span>
                       <div className="space-y-1 border-b border-border/40 pb-3 sm:pb-4 w-full group-last/item:border-0">
                         <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-[10px] py-0 px-2 h-5 border-gold/30 text-gold-dark bg-gold/10">
                              {article.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{article.read_time}</span>
                         </div>
                         <h4 className="font-bold text-base sm:text-lg leading-tight group-hover/item:text-primary transition-colors line-clamp-2">
                           {article.title}
                         </h4>
                         <p className="text-sm text-muted-foreground line-clamp-1">
                            {article.description}
                         </p>
                       </div>
                     </div>
                   ))}

                   {inFocusArticles.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground italic">
                        No additional hot topics in this category.
                      </div>
                   )}
                 </div>

                 <div className="mt-4 sm:mt-6 pt-3 sm:pt-4">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-between group text-muted-foreground hover:text-primary"
                      onClick={() => {
                         const element = document.getElementById('latest-insights');
                         element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      View All Articles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* All Briefs Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16" id="latest-insights">
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-center mb-8 sm:mb-12">
          {selectedCategory === 'All' ? <span className="text-primary">All Briefs<span className="text-gold">.</span></span> : <span className="text-primary">{selectedCategory}<span className="text-gold">.</span></span>}
        </h2>

        {paginatedArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {paginatedArticles.map((article) => (
                <div 
                  key={article.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/the-brief/${article.id}`)}
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
        ) : (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-lg text-muted-foreground">No articles found in this category yet.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Blog;
