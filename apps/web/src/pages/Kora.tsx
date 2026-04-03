import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Brain, Lightbulb, CheckCircle2, Zap, Clock, Users, TrendingUp, Layers2, LayoutList } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
const Kora = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    toast
  } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast({
        title: "Missing information",
        description: "Please enter both your name and email.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        error
      } = await supabase.from("subscribers").insert({
        email,
        name
      });
      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already registered",
            description: "You're already on the early access list!"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "You're on the list!",
          description: "We'll notify you when early access opens."
        });
        setEmail("");
        setName("");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const featurePillars = [
    {
      principle: "Data first",
      title: "Brand Intelligence",
      description:
        "Research-backed understanding that helps teams make smarter brand decisions before they produce more content.",
      icon: Brain,
      items: ["Creative Hub", "Brand Blueprints", "Target Audience", "Brand Strategy", "Intelligence Sources"],
    },
    {
      principle: "Creative second",
      title: "Creative Planning",
      description:
        "Strategic content and campaign development built around audience trust, message clarity, and stronger execution.",
      icon: Layers2,
      items: ["Creative Hub", "Campaigns"],
    },
    {
      principle: "Management third",
      title: "Content Operations",
      description:
        "Structured systems for calendars, shoots, publishing, and asset organization so the work stays aligned.",
      icon: LayoutList,
      items: ["Content Calendar", "Filming Schedule", "Blog Management", "Asset Library"],
    },
  ] as const;
  const benefits = [{
    icon: Zap,
    text: "10x faster strategy development"
  }, {
    icon: Clock,
    text: "Save 20+ hours per week on planning"
  }, {
    icon: Users,
    text: "Deeper audience understanding"
  }, {
    icon: TrendingUp,
    text: "Data-driven decision making"
  }];
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px] opacity-60"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.7
        }} className="text-center space-y-8">
            <Badge variant="outline" className="px-4 py-2 text-sm border-primary/40 bg-primary/10 text-primary tracking-wide uppercase font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              Early Access Program
            </Badge>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-serif tracking-tight text-foreground leading-[0.95]">
              Meet K<span className="text-primary">.</span>O<span className="text-primary">.</span>R<span className="text-primary">.</span>A<span className="text-gold">.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              <span className="font-semibold text-foreground">Knowledge-Oriented-Retrieval-Assistant</span> — Your AI-powered brand intelligence partner that transforms how you build and manage your brand.
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">Powered by VaughnX Technologies<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Powered by JahKnowsPR
              </span>
              <span className="text-border">•</span>
              <span>Built for Leaders</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What is K.O.R.A Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-muted/30 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.7
        }} className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
                Brand Intelligence<span className="text-gold">.</span> Reimagined<span className="text-primary">.</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                K.O.R.A. isn't just another AI tool. It's your strategic partner in building authority, clarity, and influence.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-8">
              <Card className="bg-background border-border/50 hover:border-primary/40 transition-colors">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Strategic Reasoning</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    K.O.R.A. understands context, brand positioning, and market dynamics to provide recommendations that actually move the needle.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background border-border/50 hover:border-gold/40 transition-colors">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Proactive Insights</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Don't wait for problems. K.O.R.A. identifies opportunities and risks before they become visible to competitors.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform capabilities: intelligence → creative → operations */}
      <section className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14 md:mb-16 space-y-6"
          >
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
              What We Bring to the Work<span className="text-gold">.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              This is not a platform built to do everything. It is built to help brands and creative teams do the right
              things in the right order, with audience trust at the center.
            </p>
            <p className="text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              KORA is data first, creative second, and management third. We start with intelligence, turn it into focused
              strategy, and support execution with structure so the work stays aligned. Growth and scale may follow, but
              they are outcomes, not the promise.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {featurePillars.map((pillar, index) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full bg-background border-border/50 hover:border-primary/25 hover:shadow-lg transition-all duration-300 group flex flex-col">
                  <CardContent className="p-6 md:p-7 flex flex-col flex-1 space-y-5">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary/90">{pillar.principle}</p>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <pillar.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">{pillar.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{pillar.description}</p>
                    </div>
                    <div className="pt-4 mt-auto border-t border-border/60">
                      <p className="text-xs font-medium text-foreground/80 mb-3">In the platform</p>
                      <ul className="space-y-2.5 text-sm text-muted-foreground">
                        {pillar.items.map((item) => (
                          <li key={item} className="flex gap-2.5 leading-snug">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/80" aria-hidden />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-primary/5 border-y border-primary/20">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.7
        }} className="text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
                Why Early Adopters Win<span className="text-gold">.</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Be among the first to leverage K.O.R.A. for your brand.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => <motion.div key={benefit.text} initial={{
              opacity: 0,
              x: index % 2 === 0 ? -20 : 20
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.5,
              delay: index * 0.1
            }} className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-gold" />
                  </div>
                  <span className="text-foreground font-medium">{benefit.text}</span>
                </motion.div>)}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Early Access CTA Section */}
      <section className="py-24 md:py-32 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.7
        }} className="text-center space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="px-4 py-2 text-sm border-gold/40 bg-gold/10 text-gold-dark tracking-wide uppercase font-semibold">
                Limited Spots Available
              </Badge>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
                Request Early Access<span className="text-gold">.</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Join the waitlist to be among the first to experience K.O.R.A. and help shape its future.
              </p>
            </div>

            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} className="h-12 bg-background" required />
                    <Input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 bg-background" required />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full h-14 text-lg font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Request Demo Access"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Free during beta
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Priority support
                  </span>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              By joining, you agree to provide feedback to help us improve K.O.R.A.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer Note */}
      <section className="py-12 px-4 sm:px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Logo showText={false} className="h-6 w-6" />
            <span className="text-sm">K.O.R.A. is developed by VaughnX Technology — Business Intelligence & Management</span>
          </div>
        </div>
      </section>
    </div>;
};
export default Kora;