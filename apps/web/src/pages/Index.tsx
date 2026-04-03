import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Palette,
  Star,
  Target,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ContactSection from "@/components/ContactSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import WelcomeTheBrief from "@/components/WelcomeTheBrief";
import { motion } from "framer-motion";
const CREATIVE_CONSULT_MAIL =
  "mailto:welcome@jahknowspr.com?subject=Creative%20services%20consultation&body=Tell%20us%20about%20your%20project%20(videography%2C%20photography%2C%20branding%2C%20web%2C%20etc.)%3A%0A%0A";

const CAMPAIGN_RETAINER_MAIL =
  "mailto:welcome@jahknowspr.com?subject=Campaign%20%26%20retainer%20inquiry&body=Share%20your%20goals%2C%20timeline%2C%20and%20what%20ongoing%20support%20should%20look%20like%3A%0A%0A";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasTheBriefAccess } = useAuth();
  
  // Typing Animation State
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  
  useEffect(() => {
    document.title = "Brand Intelligence & Public Relations | JahKnowsPR";
    
    const words = ["Leader"];
    
    // Typing Logic
    let timer: NodeJS.Timeout;
    const i = loopNum % words.length;
    const fullText = words[i];

    if (isDeleting) {
      // Deleting speed
      timer = setTimeout(() => {
        setText(fullText.substring(0, text.length - 1));
      }, 75);
    } else {
      // Typing speed
      if (text !== fullText) {
        timer = setTimeout(() => {
          setText(fullText.substring(0, text.length + 1));
        }, 150);
      } else {
        // Pause at end of word
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 3000);
      }
    }

    // Reset after full deletion
    if (isDeleting && text === "") {
      setIsDeleting(false);
      setLoopNum(loopNum + 1);
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum]);

  // Smooth scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const hash = location.hash;
      const stateId = location.state?.scrollTo;
      const targetId = hash ? hash.replace('#', '') : stateId;

      if (targetId) {
        setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };
    handleScroll();
  }, [location]);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 sm:px-6 overflow-hidden border-b border-gold/20">
        {/* Subtle Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background/80 pointer-events-none"></div>


        <div className="max-w-7xl mx-auto relative z-10 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            
            <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <Badge variant="outline" className="px-4 py-1.5 text-sm border-gold/40 bg-gold/10 text-gold-dark tracking-wide uppercase font-semibold">
                Brand Intelligence & Public Relations
              </Badge>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-serif tracking-tight text-foreground leading-[0.9]">
                Clarity for the<span className="text-gold">.</span> <br />
                <span className="relative inline-block">
                  <span className="text-primary italic relative z-10">
                    {text}
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-gold/40 -z-10 transition-all duration-300" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                    </svg>
                  </span>
                  <span className="ml-1 inline-block w-[3px] h-[0.8em] bg-gold animate-pulse align-baseline rounded-full"></span>
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed font-light">
                Authority is built. Not posted.
              </p>
              
              <div className="flex justify-center pt-4">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="h-14 px-8 text-lg font-semibold rounded-full shadow-xl shadow-primary/20"
                  onClick={() => navigate('/the-brief')}
                >
                  Read The Brief
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Hero Image / Visual */}
            <div className="hidden md:block relative w-full max-w-md animate-in fade-in zoom-in-95 duration-1000 delay-200 mt-8 md:mt-0">
               {/* Decorative background blur */}
               <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-full blur-[100px] opacity-60"></div>
               
               <div className="relative">
                 <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/10 rotate-3 transition-transform hover:rotate-0 duration-500">
                   <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent z-10 mix-blend-multiply"></div>
                   <img 
                     src="hero-image.png" 
                     alt="JahKnowsPR Strategy" 
                     className="w-full h-auto object-cover"
                   />
                   
                   {/* Floating Badge */}
                    <div className="absolute bottom-6 left-6 z-20 bg-background/90 backdrop-blur-md p-4 rounded-xl border border-gold/30 shadow-lg max-w-[200px]">
                      <div className="flex gap-1 text-gold mb-2">
                        <Star className="w-4 h-4 fill-gold" />
                        <Star className="w-4 h-4 fill-gold" />
                        <Star className="w-4 h-4 fill-gold" />
                        <Star className="w-4 h-4 fill-gold" />
                        <Star className="w-4 h-4 fill-gold" />
                     </div>
                     <p className="text-xs font-medium italic text-muted-foreground leading-tight">
                       "Strategic clarity that actually moves the needle."
                     </p>
                   </div>
                 </div>
               </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="aspect-video bg-gradient-to-br from-gold/20 via-gold/10 to-gold/5 rounded-2xl border border-gold/40 shadow-lg overflow-hidden flex items-center justify-center">
            {/* Replace with your YouTube embed */}
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-gold via-gold-dark to-gold bg-clip-text text-transparent">Coming Soon</p>
              <p className="text-sm mt-2 text-gold-dark/70">Video content launching soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-background border-b border-gold/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ y: 20 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: "some", margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.7 }}
            className="text-center space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
                How Authority Is Built<span className="text-gold">.</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                We don't rush visibility. We build the structure that makes it sustainable.
              </p>
            </div>
            
            <div className="pt-6 space-y-6 text-left md:text-center">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Most brands move too fast. They speak before they're positioned, post before their narrative is clear, and scale visibility before the foundation is strong enough to support it.
              </p>
              <p className="text-base md:text-lg text-foreground font-medium">
                Our work is designed to prevent that.
              </p>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                JahKnowsPR operates in clear stages. Each phase builds on the one before it, ensuring that when a brand is seen, it is understood. And when it is understood, it can lead.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services — aligned with /work-with-me */}
      <section id="services" className="py-20 md:py-28 px-4 sm:px-6 bg-muted/30 border-b border-gold/20 scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 20 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: "some", margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12 md:mb-16 space-y-4"
          >
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
              Services<span className="text-gold">.</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Same ladder as our Services page: free perspective → light add-on → first paid strategy session →
              production → ongoing campaigns → invitation-based platform. Full positioning lives on{" "}
              <Link to="/work-with-me" className="font-medium text-primary underline-offset-4 hover:underline">
                How we work with you
              </Link>
              .
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {[
              {
                step: "01",
                eyebrow: "Free",
                title: "The Brief",
                body: "Free perspective — sharper thinking before you spend. Strategic angles and real commentary for founders, creatives, and operators still exploring.",
                who: "Anyone learning how we think before a paid commitment.",
                href: "/the-brief",
                cta: "Go to The Brief",
                external: false,
                icon: BookOpen,
                delay: 0.05,
              },
              {
                step: "02",
                eyebrow: "Add-on",
                title: "Join KORA on Telegram",
                body: "Light support in chat — ideas, prompts, back-and-forth without full platform login. Not core software access.",
                who: "People who live in chat and want KORA in a simple daily format.",
                href: "/kora",
                cta: "Meet KORA in Telegram",
                price: "$15/mo",
                external: false,
                icon: MessageCircle,
                delay: 0.1,
              },
              {
                step: "03",
                eyebrow: "Paid session",
                title: "Strategy Session",
                bestseller: true,
                body: "$150 · 60 min · Zoom or in person. The first paid step — clarity on positioning, visibility, and next moves before deeper work or system access.",
                who: "Founders and businesses who need strategy before software, retainers, or heavy execution.",
                href: "/strategy-session",
                cta: "Book a Strategy Session",
                external: false,
                icon: Target,
                delay: 0.15,
              },
              {
                step: "04",
                eyebrow: "Production",
                title: "Creative Work & Production",
                body: "Videography, photography, branding, sites — scoped on timeline and deliverables for clients ready to execute.",
                who: "Teams that need assets, direction, and hands-on production.",
                href: CREATIVE_CONSULT_MAIL,
                cta: "Book a Creative Consultation",
                external: true,
                icon: Palette,
                delay: 0.2,
              },
              {
                step: "05",
                eyebrow: "Ongoing",
                title: "Campaigns & Retainers",
                body: "Ongoing strategy and campaign leadership — not a one-off. Launches, visibility, cadence, and coordination month to month.",
                who: "Brands that need sustained momentum and a strategic partner in the loop.",
                href: CAMPAIGN_RETAINER_MAIL,
                cta: "Discuss a Campaign Retainer",
                external: true,
                icon: Megaphone,
                delay: 0.25,
              },
              {
                step: "06",
                eyebrow: "Platform",
                title: "KORA Full Platform Access",
                body: "Strategy, workflows, calendars, and support in one system — offered by invitation after fit and onboarding.",
                who: "Qualified clients ready for structured workflow and deeper access.",
                href: "/kora",
                cta: "Learn About Full KORA Access",
                external: false,
                icon: LayoutDashboard,
                delay: 0.3,
              },
            ].map(
              ({
                step,
                eyebrow,
                title,
                body,
                who,
                href,
                cta,
                external,
                icon: Icon,
                delay,
                price,
                bestseller,
              }) => (
                <motion.div
                  key={step}
                  initial={{ y: 16 }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true, amount: "some", margin: "0px 0px -80px 0px" }}
                  transition={{ duration: 0.55, delay }}
                  className="group relative flex flex-col bg-background rounded-2xl p-8 shadow-sm border border-border/50 hover:shadow-lg hover:border-gold/40 transition-all duration-500"
                >
                  <div className="absolute top-6 right-6 text-5xl font-serif font-bold text-gold/20 group-hover:text-gold/35 transition-colors duration-500 select-none">
                    {step}
                  </div>
                  <div className="relative flex flex-col flex-1 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Icon className="h-6 w-6 shrink-0 opacity-90" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {eyebrow}
                      </span>
                    </div>
                    <div className="space-y-2 pr-8">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <h3 className="text-lg md:text-xl font-serif font-bold text-foreground">{title}</h3>
                        {bestseller ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden />
                            Bestseller
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{body}</p>
                      {who ? (
                        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3 mt-2">
                          <span className="font-semibold text-foreground/85">Who it is for: </span>
                          {who}
                        </p>
                      ) : null}
                    </div>
                    <div className="pt-2 mt-auto flex flex-wrap items-center gap-x-3 gap-y-2">
                      {external ? (
                        <Button variant="hero" size="sm" className="rounded-full" asChild>
                          <a href={href}>{cta}</a>
                        </Button>
                      ) : (
                        <Button variant="hero" size="sm" className="rounded-full" asChild>
                          <Link to={href}>{cta}</Link>
                        </Button>
                      )}
                      {price ? (
                        <span className="text-sm font-semibold text-muted-foreground tabular-nums">{price}</span>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Who This is For Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-background border-b border-gold/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ y: 20 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: "some", margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.7 }}
            className="text-center space-y-8"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Who This is For
              </p>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
                Built for Leaders Who Think Long-Term<span className="text-gold">.</span>
              </h2>
            </div>
            
            <div className="pt-4 space-y-6 max-w-3xl mx-auto">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Our work is not designed for rapid hype or short-term attention.
              </p>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                It is built for founders, executives, and visionaries who understand that authority compounds, reputation carries weight, and visibility without clarity is a liability.
              </p>
              <p className="text-lg md:text-xl font-medium text-foreground pt-2">
                If that resonates, you are in the right place.
              </p>
            </div>
          </motion.div>
        </div>
      </section>


      {/* Early Access / Newsletter Section */}
      <div id="newsletter" className="relative z-10">
        {hasTheBriefAccess ? (
            <WelcomeTheBrief />
        ) : (
            <SubscriptionSection />
        )}
      </div>

      {/* CTA Section / Contact */}
      <div className="relative z-10">
        <ContactSection />
      </div>

    </div>
  );
};

export default Index;
