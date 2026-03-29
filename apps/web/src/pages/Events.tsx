import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, ExternalLink, Sparkles, ArrowRight, User, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  registration_url: string | null;
  category: string | null;
  is_featured: boolean;
};

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

const Events = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("articles");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 6;

  useEffect(() => {
    document.title = "The Brief | JahKnowsPR";
    fetchData();
    
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

  const fetchData = async () => {
    const [eventsResult, articlesResult] = await Promise.all([
      supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true }),
      supabase
        .from("blog_posts")
        .select("*")
        .eq("is_hidden", false)
        .order("published_date", { ascending: false }),
    ]);

    if (eventsResult.data) {
      setEvents(eventsResult.data as Event[]);
    }
    if (articlesResult.data) {
      setArticles(articlesResult.data as BlogPost[]);
    }
    setLoading(false);
  };

  const featuredEvent = events.find((e) => e.is_featured);
  const upcomingEvents = events.filter((e) => !e.is_featured);

  const categories = ["All", "Hot Topic", ...Array.from(new Set(articles.map(a => a.category).filter(Boolean)))];

  const heroArticle = articles.find(a => a.is_featured) || articles[0];
  
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
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            You now have access to The Brief. Explore our articles and upcoming events below.
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 overflow-hidden bg-secondary dark:bg-background border-b">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(45_70%_65%_/_0.08),transparent)]"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-gold/30 bg-gold/5 text-gold-dark uppercase tracking-widest font-semibold">
            Strategic Insights
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-primary mb-6">
            The Brief<span className="text-gold">.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            Where our thinking lives before it becomes execution. Strategic insights, upcoming events, and curated intelligence.
          </p>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mx-auto">
              <TabsTrigger value="articles" className="px-6">Articles</TabsTrigger>
              <TabsTrigger value="events" className="px-6">Events</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Articles Tab Content */}
      {activeTab === "articles" && (
        <>
          {/* Category Filter & Featured */}
          <section className="py-8 sm:py-12 px-4 sm:px-6 bg-background">
            <div className="max-w-7xl mx-auto">
              {/* Category Filters */}
              <div className="flex flex-wrap gap-2 mb-8 justify-center">
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

              {heroArticle && (
                <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start">
                  {/* Featured Article */}
                  <div 
                    className="lg:col-span-7 group cursor-pointer"
                    onClick={() => navigate(`/the-brief/${heroArticle.id}`)}
                  >
                    <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-muted relative mb-4 sm:mb-6 shadow-xl shadow-primary/10 dark:shadow-none aspect-[4/3] sm:aspect-[940/788] w-full">
                      {heroArticle.cover_image_url ? (
                        <img
                          src={heroArticle.cover_image_url}
                          alt={heroArticle.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-muted" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/10" />
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

                  {/* In Focus List */}
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
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* All Briefs Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
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
          </section>
        </>
      )}

      {/* Events Tab Content */}
      {activeTab === "events" && (
        <>
          {/* Featured Event */}
          {featuredEvent && (
            <section className="py-16 px-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <Sparkles className="w-5 h-5 text-gold" />
                  <h2 className="text-2xl font-serif font-bold text-primary">Featured Event</h2>
                </div>
                <Card className="overflow-hidden border-gold/20 shadow-xl">
                  <div className="grid lg:grid-cols-2">
                    {featuredEvent.cover_image_url ? (
                      <div className="aspect-video lg:aspect-auto lg:h-full">
                        <img
                          src={featuredEvent.cover_image_url}
                          alt={featuredEvent.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video lg:aspect-auto lg:h-full bg-gradient-to-br from-primary/10 to-gold/10" />
                    )}
                    <CardContent className="p-8 lg:p-12 flex flex-col justify-center">
                      {featuredEvent.category && (
                        <Badge className="w-fit mb-4 bg-gold/10 text-gold-dark border-gold/30">
                          {featuredEvent.category}
                        </Badge>
                      )}
                      <h3 className="text-3xl font-serif font-bold text-primary mb-4">
                        {featuredEvent.title}
                      </h3>
                      {featuredEvent.description && (
                        <p className="text-muted-foreground mb-6 leading-relaxed">
                          {featuredEvent.description}
                        </p>
                      )}
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="w-4 h-4 text-gold" />
                          <span>{format(new Date(featuredEvent.event_date), "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="w-4 h-4 text-gold" />
                          <span>{format(new Date(featuredEvent.event_date), "h:mm a")}</span>
                        </div>
                        {featuredEvent.location && (
                          <div className="flex items-center gap-3 text-sm">
                            <MapPin className="w-4 h-4 text-gold" />
                            <span>{featuredEvent.location}</span>
                          </div>
                        )}
                      </div>
                      {featuredEvent.registration_url && (
                        <Button size="lg" className="w-fit" asChild>
                          <a href={featuredEvent.registration_url} target="_blank" rel="noopener noreferrer">
                            Register Now
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </div>
                </Card>
              </div>
            </section>
          )}

          {/* Upcoming Events Grid */}
          <section className="py-16 px-6 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-serif font-bold text-primary mb-10 text-center">
                All Upcoming Events<span className="text-gold">.</span>
              </h2>

              {events.length === 0 ? (
                <div className="text-center py-20">
                  <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                  <h3 className="text-2xl font-serif font-bold text-primary mb-3">No Events Scheduled</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Check back soon for upcoming workshops, speaking engagements, and exclusive networking opportunities.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {(featuredEvent ? upcomingEvents : events).map((event) => (
                    <Card key={event.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                      {event.cover_image_url ? (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={event.cover_image_url}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-primary/10 to-gold/10" />
                      )}
                      <CardContent className="p-6">
                        {event.category && (
                          <Badge variant="outline" className="mb-3 text-xs border-gold/30">
                            {event.category}
                          </Badge>
                        )}
                        <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-gold-dark transition-colors">
                          {event.title}
                        </h3>
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(event.event_date), "MMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{format(new Date(event.event_date), "h:mm a")}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                        {event.registration_url && (
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                              Register
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Events;
