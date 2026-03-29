import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Award, Users, Target, ArrowRight } from "lucide-react";
import jahHeroImage from "@/assets/jah-hero-image.jpg";
import strategyConcept from "@/assets/strategy-concept.jpg";
import militaryPrecision from "@/assets/military-precision.jpg";
import brandClarity from "@/assets/brand-clarity.jpg";
import missionBackground from "@/assets/mission-background.jpg";

// SEO function for About page
const updateAboutSEO = () => {
  document.title = "About | JahKnowsPR";
  
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', 'Strategic brand intelligence and public relations for founders, creators, and organizations building long-term credibility, clarity, and influence.');
  }
  
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', window.location.origin + '/about');
  }
};

const About = () => {
  useEffect(() => {
    updateAboutSEO();
  }, []);

  const achievements = [
    { icon: Users, number: "500+", label: "Brands Transformed" },
    { icon: Star, number: "98%", label: "Client Satisfaction" },
    { icon: Award, number: "5+", label: "Years Experience" },
    { icon: Target, number: "300%", label: "Avg. Engagement Increase" }
  ];

  const values = [
    {
      title: "Clarity Over Confusion",
      description: "Your message should be crystal clear, not cloudy. I help you cut through the noise and speak directly to your people."
    },
    {
      title: "Strategy Over Guesswork",
      description: "Every brand decision should be strategic, not based on what 'feels right.' I give you the framework to make confident choices."
    },
    {
      title: "Action Over Analysis",
      description: "Overthinking kills momentum. I provide clear action steps so you can move forward with confidence and purpose."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-gradient-accent text-accent-foreground mb-4">
                Media Strategist & Veteran
              </Badge>
              
              <h1 className="text-5xl font-bold text-foreground mb-6">
                Hey, I'm Jah — Your Brand's Strategic Advantage
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                I'm a media strategist and military veteran who helps visionary entrepreneurs 
                build brands that don't just exist — they <em>matter</em>. After serving my country, 
                I discovered my true mission: helping business owners serve theirs.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {achievements.map((achievement, index) => (
                  <div key={index} className="text-center p-4 bg-muted/30 rounded-lg">
                    <achievement.icon className="w-8 h-8 text-accent mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">{achievement.number}</div>
                    <div className="text-sm text-muted-foreground">{achievement.label}</div>
                  </div>
                ))}
              </div>

              <Button variant="cta" size="lg" className="group">
                Work With Me
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div className="relative">
              <img
                src={jahHeroImage}
                alt="Jah - Media Strategist and Brand Expert"
                className="w-full h-[500px] object-cover rounded-2xl shadow-professional"
              />
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-xl shadow-professional">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground font-medium">
                  "Jah doesn't just build brands —<br />she builds empires."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-20 px-4 bg-gradient-subtle relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={militaryPrecision}
            alt="Strategic planning background"
            className="w-full h-full object-cover opacity-5"
          />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-6">
              From Military Precision to Brand Clarity
            </h2>
            <p className="text-xl text-muted-foreground">
              My journey from serving in the military to serving entrepreneurs
            </p>
          </div>

          <div className="space-y-8">
            <Card className="border-0 shadow-professional">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <img
                      src={strategyConcept}
                      alt="Strategy concept illustration"
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground mb-4">
                      The Problem I Kept Seeing
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      After transitioning from military service, I watched brilliant entrepreneurs struggle 
                      with the same challenge over and over: they had incredible visions and solutions, 
                      but they couldn't communicate WHO they served or WHY they were different. 
                      They were building amazing businesses that no one understood.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-professional">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <img
                      src={brandClarity}
                      alt="Brand clarity visualization"
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground mb-4">
                      My Strategic Solution
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      I combined my military training in strategic planning with my passion for 
                      brand psychology to create something unique: blueprint reports that give 
                      entrepreneurs the strategic foundation they need to build brands that 
                      actually connect and convert. No fluff, no guesswork — just clear, 
                      actionable strategy.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-professional">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  Why I Created These Reports
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Because every entrepreneur deserves to feel confident about their brand. 
                  You shouldn't have to guess about your messaging or wonder if you're 
                  talking to the right people. My reports give you the clarity and confidence 
                  to build a brand that attracts your perfect customers and positions you 
                  as the obvious choice.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-6">
              My Core Values
            </h2>
            <p className="text-xl text-muted-foreground">
              The principles that guide every strategy I create
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-0 shadow-professional hover:shadow-accent transition-all duration-300 group">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-accent-foreground">{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 px-4 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={missionBackground}
            alt="Mission background"
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6">
            My Mission
          </h2>
          <p className="text-2xl leading-relaxed mb-8 text-white/90">
            To help visionary entrepreneurs build brands that don't just exist in the marketplace — 
            they lead it. Because when you're clear on who you serve and confident in your message, 
            you don't just build a business. You build a movement.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" className="group">
              Get Your Brand Report
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="secondary" 
              size="lg" 
              className="bg-white text-primary border-2 border-white hover:bg-white/90 hover:text-primary/90 font-semibold shadow-lg"
            >
              Book a Strategy Call
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;