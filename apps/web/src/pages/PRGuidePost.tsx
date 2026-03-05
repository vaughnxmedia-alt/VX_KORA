import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowLeft, User, Share2, Bookmark, Eye } from "lucide-react";

const PRGuidePost = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // SEO optimization
    document.title = "What Is Public Relations? Beginner's Guide for Entrepreneurs & Content Creators | The Brief";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', "What is Public Relations? This beginner's guide for entrepreneurs and content creators explains how PR builds credibility, visibility, and trust while offering practical tips to grow your brand.");
    }
  }, []);

  const shareToTwitter = () => {
    const text = "What Is Public Relations? Beginner's Guide for Entrepreneurs & Content Creators";
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&via=jahmedia`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (err) {
      console.error('Failed to copy link');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header Navigation */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-professional">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/the-brief")}
              className="text-muted-foreground hover:text-primary transition-smooth font-medium"
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
                className="hover:text-primary transition-smooth"
              >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Save</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 py-16">
        {/* Article Header */}
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Badge 
              variant="secondary" 
              className="font-medium text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20"
            >
              Public Relations
            </Badge>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-serif font-bold text-foreground leading-[1.1] mb-8 tracking-tight">
            What Is Public Relations? Beginner's Guide for Entrepreneurs & Content Creators
          </h1>
          
          <p className="text-xl text-foreground/80 leading-relaxed mb-12 max-w-3xl font-normal">
            A plain-spoken, practical breakdown of PR—why it matters, how to use it, and what actually moves the needle for your brand.
          </p>
          
          {/* Author and Meta Info */}
          <div className="bg-card rounded-2xl p-8 shadow-professional border border-border/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center shadow-accent">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground mb-1">JahKnowsPR</div>
                  <div className="text-muted-foreground font-medium">Brand Intelligence & Public Relations</div>
                  <div className="text-sm text-muted-foreground/80 mt-1">Strategic communications for founders and organizations</div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium">January 15, 2025</span>
                </div>
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-medium">8 min read</span>
                </div>
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="font-medium">1,247 views</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Table of Contents */}
        <div className="bg-muted/30 border border-border/50 rounded-2xl p-8 mb-12">
          <h3 className="text-lg font-bold text-foreground mb-4">On this page</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#intro" className="hover:text-primary transition-smooth">Introduction</a></li>
            <li><a href="#journey" className="hover:text-primary transition-smooth">My Personal Journey Into PR</a></li>
            <li><a href="#why-pr" className="hover:text-primary transition-smooth">Why PR Matters for Entrepreneurs & Creators</a></li>
            <li><a href="#elements" className="hover:text-primary transition-smooth">Key Elements of PR for Beginners</a></li>
            <li><a href="#tips" className="hover:text-primary transition-smooth">Practical PR Tips</a></li>
            <li><a href="#engage" className="hover:text-primary transition-smooth">Engaging Your Audience</a></li>
            <li><a href="#conclusion" className="hover:text-primary transition-smooth">Conclusion</a></li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="bg-background rounded-3xl p-12 shadow-professional border border-border/30 mb-16">
          <div className="prose prose-xl max-w-none">
            
            {/* Introduction */}
            <section id="intro" className="mb-12">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-6 border-l-4 border-primary pl-4">
                Introduction
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                <span className="float-left text-6xl font-serif font-bold text-primary leading-none pr-3 pt-1">I</span>
                magine you've just launched your dream business. You've poured your time, money, and heart into creating a product or service you believe in. But when it's time to share it with the world—no one seems to notice. That's where Public Relations (PR) comes in. PR is the megaphone that ensures your story reaches the right audience, in the right way, at the right time.
              </p>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                According to the <a href="https://www.prsa.org/about/what-is-public-relations" target="_blank" rel="noopener" className="text-primary hover:underline">Public Relations Society of America (PRSA)</a>, PR is "a strategic communication process that builds mutually beneficial relationships between organizations and their publics." It's more than press releases or social media posts—it's about shaping perception, building credibility, and creating trust.
              </p>
              <p className="text-lg text-foreground/90 leading-relaxed">
                If you've ever asked yourself "What does PR mean for entrepreneurs?" or "How can content creators use PR to grow?" — this guide is for you.
              </p>
            </section>

            <hr className="border-border/30 my-12" />

            {/* Personal Journey */}
            <section id="journey" className="mb-12">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-6 border-l-4 border-primary pl-4">
                My Personal Journey Into PR
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                For me, PR wasn't something I stumbled on by chance—it was born out of a moment of reflection. After my grandfather passed away, I found myself questioning the path I was taking in computer science. His passing made me pause and ask: <em>Was I truly pursuing something I loved, or just following a safe route?</em>
              </p>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                In that search for clarity, I took a career aptitude test. Public Relations surfaced as a strong fit. I leaned in and soon earned an opportunity to intern at <strong>The Britto Agency</strong>, a prestigious PR firm in New York under the leadership of Marvet Britto. From day one, I dove into intensive research—not just about clients, but about the history and foundation of the industry itself.
              </p>
              <p className="text-lg text-foreground/90 leading-relaxed">
                At the time, I didn't quite understand why she made me start with research—it felt tedious and far from the exciting parts of PR I imagined. But as my journey unfolded, I realized how foundational it was. That's when I encountered the work of Edward Bernays, often called the "Father of Public Relations." Learning how PR shaped movements, industries, and even cultures opened my mind. It wasn't just communications—it was influence, strategy, and narratives that move people. Looking back, beginning there made perfect sense. That discovery sparked my path into PR, and it's a passion I carry into every project today.
              </p>
            </section>

            <hr className="border-border/30 my-12" />

            {/* Why PR Matters */}
            <section id="why-pr" className="mb-12">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-6 border-l-4 border-primary pl-4">
                Why PR Matters for Entrepreneurs and Content Creators
              </h2>
              
              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Builds Credibility</h3>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Credibility is currency. When your story appears in a respected outlet—local or national—it signals that someone else vetted you. Unlike ads (which audiences know are paid), earned media carries an extra layer of trust. For those starting out, that can be the difference between being overlooked and being taken seriously.
              </p>
              <blockquote className="border-l-4 border-primary bg-primary/5 p-6 rounded-r-lg my-8">
                <p className="text-lg font-semibold text-foreground mb-0">
                  <span className="text-2xl font-bold text-primary">92%</span> of consumers trust earned media over paid ads (Nielsen, 2021).
                </p>
              </blockquote>

              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Cost-Effective Visibility</h3>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Ads stop when the budget stops. PR compounds. A single feature can circulate online, be shared, and resurface in search. With smart storytelling and timing, you can stretch visibility without draining resources.
              </p>

              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Crisis Management</h3>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                No brand is immune to challenges—negative feedback, delays, missteps. Your communication in those moments defines your reputation more than the issue itself. A strong PR plan gives you clear messaging, a press protocol, and transparent responses that can deepen trust.
              </p>

              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Community Connection</h3>
              <p className="text-lg text-foreground/90 leading-relaxed">
                Modern audiences care what you stand for. Aligning with causes and community work builds goodwill and opens doors—partnerships, speaking, loyal fans who advocate for you.
              </p>
            </section>

            <hr className="border-border/30 my-12" />

            {/* Key Elements */}
            <section id="elements" className="mb-12">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-6 border-l-4 border-primary pl-4">
                Key Elements of PR for Beginners
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-8">
                Let's pause here. I don't want to hand you a checklist—I want to talk like we're across the table, building something that actually works.
              </p>

              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Media Relations</h3>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                This is the heartbeat of PR. It's not about blasting releases—it's about real relationships. Learn a reporter's beat, engage with their work, and make your pitch matter to <em>them</em>.
              </p>
              <blockquote className="border-l-4 border-primary bg-primary/5 p-6 rounded-r-lg my-8">
                <p className="text-lg text-foreground mb-0">
                  70% of journalists prefer personalized pitches tied to their beat (Cision, 2023 Global State of the Media).
                </p>
              </blockquote>

              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Content Creation</h3>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Content is proof of credibility: press releases, blogs, op-eds, LinkedIn articles. Be consistent. If you don't tell your story, someone else will—and not how you want it told.
              </p>

              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Event PR</h3>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Events create momentum fast. They don't have to be huge—pop-ups, panels, workshops can work if packaged right. A local café hosted a small community event, pitched the paper, and tripled weekend foot traffic. Moments become stories.
              </p>

              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Crisis Communication</h3>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Every brand faces a moment. Will the moment define you—or will you define it? Good crisis PR is accountability + clarity. It can actually strengthen reputation.
              </p>

              <h3 className="text-2xl font-serif font-bold text-foreground mb-4 mt-8">Digital PR</h3>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Traditional meets modern: SEO, podcasts, social, newsletters. It's not enough to land one article if no one sees it. Make sure your story appears where your audience searches.
              </p>

              <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 my-8">
                <p className="text-lg font-semibold text-foreground mb-2">Try this:</p>
                <p className="text-lg text-foreground/90 mb-0">
                  Name one journalist to build with this month, one evergreen article to write, and one micro-event you could host. Put dates on all three.
                </p>
              </div>
            </section>

            <hr className="border-border/30 my-12" />

            {/* Practical Tips */}
            <section id="tips" className="mb-12">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-6 border-l-4 border-primary pl-4">
                Practical PR Tips for Entrepreneurs & Content Creators
              </h2>
              <ul className="space-y-4 text-lg text-foreground/90 leading-relaxed">
                <li><strong>Start Local:</strong> Win your backyard first—community outlets love relevant stories.</li>
                <li><strong>Lead with Story:</strong> People connect to people, not product specs.</li>
                <li><strong>Be Newsworthy:</strong> Don't send releases unless there's real news.</li>
                <li><strong>Monitor Mentions:</strong> Set Google Alerts for your name and brand.</li>
                <li><strong>Partner Smart:</strong> Collaborate with creators who share your audience's values.</li>
              </ul>
              <p className="text-base text-muted-foreground mt-6 italic">
                Reflection: Have you Googled yourself lately? Whatever shows first—that's PR in action.
              </p>
            </section>

            <hr className="border-border/30 my-12" />

            {/* Engaging Your Audience */}
            <section id="engage" className="mb-12">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-6 border-l-4 border-primary pl-4">
                Engaging Your Audience
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                PR works best when your audience is part of the story. As you share, ask:
              </p>
              <ul className="space-y-3 text-lg text-foreground/90 leading-relaxed mb-8">
                <li>Would I be proud if this ran tomorrow?</li>
                <li>Does this reflect our values?</li>
                <li>Am I building relationships—or chasing attention?</li>
              </ul>
              <div className="bg-muted/30 border border-border/50 rounded-2xl p-6">
                <p className="text-lg font-semibold text-foreground mb-2">Quick win:</p>
                <p className="text-lg text-foreground/90 mb-0">
                  Create a simple media kit (bio, headshot, brand story, 3–5 talking points, contact info). Keep it linked in your email signature.
                </p>
              </div>
            </section>

            <hr className="border-border/30 my-12" />

            {/* Conclusion */}
            <section id="conclusion" className="mb-12">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-6 border-l-4 border-primary pl-4">
                Conclusion
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Public relations isn't about spin—it's about trust. In a world full of noise, trust is your advantage. Whether you're making your first impression or building a lasting community, PR gives you the language, the platforms, and the relationships to share your story with clarity.
              </p>
              <p className="text-lg text-foreground/90 leading-relaxed">
                My journey taught me this: it's not just about visibility; it's about legacy. Every post, every interview, every story shapes how you'll be remembered. Start small. Stay consistent. Lean into the power of storytelling—it might change your path the way it changed mine.
              </p>
            </section>

            {/* References */}
            <section className="mt-16">
              <h3 className="text-2xl font-serif font-bold text-foreground mb-6">References</h3>
              <ul className="space-y-2 text-base text-muted-foreground">
                <li><a href="https://www.prsa.org/about/what-is-public-relations" target="_blank" rel="noopener" className="text-primary hover:underline">PRSA — What is Public Relations</a></li>
                <li><a href="https://www.forbes.com/sites/forbescommunicationscouncil/2020/09/16/why-pr-is-more-important-than-ever/" target="_blank" rel="noopener" className="text-primary hover:underline">Forbes — Why PR Is More Important Than Ever</a></li>
                <li><a href="https://blog.hubspot.com/marketing/public-relations-guide" target="_blank" rel="noopener" className="text-primary hover:underline">HubSpot — The Ultimate Guide to Public Relations</a></li>
                <li><a href="https://www.cision.com/resources/white-papers/2023-global-communications-report/" target="_blank" rel="noopener" className="text-primary hover:underline">Cision — 2023 Global State of the Media</a></li>
                <li><a href="https://www.nielsen.com/insights/2021/trust-in-advertising/" target="_blank" rel="noopener" className="text-primary hover:underline">Nielsen — Trust in Advertising (2021)</a></li>
                <li><a href="https://thebrittoagency.com/" target="_blank" rel="noopener" className="text-primary hover:underline">The Britto Agency — Official Website</a></li>
              </ul>
            </section>

            {/* CTA */}
            <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 mt-12">
              <p className="text-lg font-semibold text-foreground mb-2">Get the checklist:</p>
              <p className="text-lg text-foreground/90 mb-0">
                Want my "PR Starter Kit for Entrepreneurs & Creators" (pitch template, media kit outline, and crisis one-pager)? Reply "PR STARTER" and I'll send it.
              </p>
            </div>
          </div>
        </div>

        {/* Article Footer */}
        <footer className="bg-card rounded-2xl p-8 shadow-professional border border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-lg font-semibold text-foreground">Share this insight:</span>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={shareToTwitter}
                  className="hover:bg-primary hover:text-primary-foreground transition-smooth"
                >
                  Twitter/X
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hover:bg-primary hover:text-primary-foreground transition-smooth"
                >
                  LinkedIn
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hover:bg-primary hover:text-primary-foreground transition-smooth"
                >
                  Facebook
                </Button>
              </div>
            </div>
          </div>
        </footer>
      </article>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-accent text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-serif font-bold mb-8 leading-tight">
            Ready to Transform Your Brand?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Apply these PR insights to your business with our comprehensive brand blueprint analysis and unlock your brand's full potential.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg" 
              onClick={() => navigate("/brand-blueprint")}
              className="text-lg px-8 py-4 bg-white text-primary hover:bg-white/90 transition-smooth shadow-lg"
            >
              Get Your Brand Blueprint
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate("/the-brief")}
              className="text-lg px-8 py-4 border-white text-white hover:bg-white/10 transition-smooth"
            >
              Explore More Articles
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PRGuidePost;