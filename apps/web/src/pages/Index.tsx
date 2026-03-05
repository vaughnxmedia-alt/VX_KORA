import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Target, Lightbulb, PenTool, CheckCircle2, Star } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ContactSection from "@/components/ContactSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import WelcomeTheBrief from "@/components/WelcomeTheBrief";
import { useInView, motion, animate, useMotionValue, useTransform } from "framer-motion";
import { LogoText } from "@/components/LogoText";


const CountUp = ({ to, suffix = "", prefix = "", delay = 0 }: { to: number; suffix?: string; prefix?: string; delay?: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, { duration: 2.5, delay: delay, ease: "easeOut" });
      return () => controls.stop();
    }
  }, [isInView, to, delay, count]);

  return (
    <span ref={ref}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
};



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
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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

      {/* The Four Phases Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-muted/30 border-b border-gold/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
              The Four Phases<span className="text-gold">.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
            {/* Phase 1 */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="group relative bg-background rounded-2xl p-8 shadow-sm border border-border/50 hover:shadow-lg hover:border-gold/40 transition-all duration-500"
            >
              <div className="absolute top-6 right-6 text-6xl font-serif font-bold text-gold/20 group-hover:text-gold/40 transition-colors duration-500">
                01
              </div>
              <div className="relative space-y-4">
                <h3 className="text-lg md:text-xl font-serif font-bold text-foreground">
                  The Positioning Brief
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Purpose</span>
                  <span className="text-sm font-medium text-primary">Clarity.</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We define where you stand, who you are for, and what you should not be doing. This phase eliminates guesswork and aligns your brand with the market you are actually meant to lead.
                </p>
                <p className="text-sm font-medium text-foreground italic pt-2">
                  This is where clarity is established.
                </p>
              </div>
            </motion.div>

            {/* Phase 2 */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="group relative bg-background rounded-2xl p-8 shadow-sm border border-border/50 hover:shadow-lg hover:border-gold/40 transition-all duration-500"
            >
              <div className="absolute top-6 right-6 text-6xl font-serif font-bold text-gold/20 group-hover:text-gold/40 transition-colors duration-500">
                02
              </div>
              <div className="relative space-y-4">
                <h3 className="text-lg md:text-xl font-serif font-bold text-foreground">
                  The Narrative Foundation
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Purpose</span>
                  <span className="text-sm font-medium text-primary">Consistency.</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We establish the language, themes, and message architecture that will carry your brand over time. This ensures that every public-facing move reinforces your position rather than weakening it.
                </p>
                <p className="text-sm font-medium text-foreground italic pt-2">
                  Narrative is not storytelling. It is strategy.
                </p>
              </div>
            </motion.div>

            {/* Phase 3 */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="group relative bg-background rounded-2xl p-8 shadow-sm border border-border/50 hover:shadow-lg hover:border-gold/40 transition-all duration-500"
            >
              <div className="absolute top-6 right-6 text-6xl font-serif font-bold text-gold/20 group-hover:text-gold/40 transition-colors duration-500">
                03
              </div>
              <div className="relative space-y-4">
                <h3 className="text-lg md:text-xl font-serif font-bold text-foreground">
                  The Strategic Visibility Campaign
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Purpose</span>
                  <span className="text-sm font-medium text-primary">Placement.</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Visibility is deployed intentionally. We identify when, where, and how your brand should be seen, ensuring that exposure amplifies authority instead of creating noise.
                </p>
                <p className="text-sm font-medium text-foreground italic pt-2">
                  This phase is about signal, not scale.
                </p>
              </div>
            </motion.div>

            {/* Phase 4 */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="group relative bg-background rounded-2xl p-8 shadow-sm border border-border/50 hover:shadow-lg hover:border-gold/40 transition-all duration-500"
            >
              <div className="absolute top-6 right-6 text-6xl font-serif font-bold text-gold/20 group-hover:text-gold/40 transition-colors duration-500">
                04
              </div>
              <div className="relative space-y-4">
                <h3 className="text-lg md:text-xl font-serif font-bold text-foreground">
                  The Advisory Retainer
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Purpose</span>
                  <span className="text-sm font-medium text-primary">Continuity.</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  For leaders navigating growth, transition, or public complexity, we remain in close strategic proximity. This engagement is advisory in nature and reserved for those who require ongoing discernment, not execution.
                </p>
                <p className="text-sm font-medium text-foreground italic pt-2">
                  Access is extended selectively.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Who This is For Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-background border-b border-gold/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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
