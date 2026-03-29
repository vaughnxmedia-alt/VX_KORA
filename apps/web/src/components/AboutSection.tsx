import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Users, TrendingUp, Heart } from "lucide-react";

const AboutSection = () => {
  const stats = [
    { icon: Users, number: "500+", label: "Brands Transformed" },
    { icon: TrendingUp, number: "98%", label: "Client Satisfaction" },
    { icon: Award, number: "5★", label: "Average Rating" },
    { icon: Heart, number: "7+", label: "Years Experience" }
  ];

  return (
    <section id="about" className="py-12 sm:py-16 md:py-20 lg:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start lg:items-center">
          {/* Content */}
          <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
            <div>
              <Badge variant="outline" className="mb-4 text-accent border-accent">
                About JahKnowsPR
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 leading-tight uppercase">
                Where Vision Meets Strategic Precision
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-6 md:mb-8">
                I'm Jah, a brand strategist and publicist with over 7 years of experience 
                helping visionary entrepreneurs transform their big ideas into brands that 
                actually connect and convert.
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="border-l-4 border-accent pl-4 md:pl-6">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                  My Mission
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  To bridge the gap between having a powerful vision and knowing exactly 
                  how to communicate it. I believe every entrepreneur deserves clarity, 
                  confidence, and a strategic foundation that turns their passion into profit.
                  Seen, Heard, and Remembered.
                </p>
              </div>

              <div className="border-l-4 border-accent pl-4 md:pl-6">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                  Why I Created These Blueprints
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  After years of working with clients, I noticed the same pattern: brilliant 
                  entrepreneurs with world-changing ideas who struggled to articulate their 
                  value. These reports solve that problem with publicist-level strategy 
                  at an accessible price point.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-6 md:pt-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-accent">{stat.number}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Image/Visual Element */}
          <div className="relative order-1 lg:order-2 mb-8 lg:mb-0">
            <Card className="border-0 shadow-professional overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-[4/5] bg-gradient-subtle flex items-center justify-center">
                  <div className="text-center p-6 md:p-8">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                      <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent-foreground">J</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Jah</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-3 md:mb-4">Brand Strategist & Publicist</p>
                    <Badge variant="outline" className="text-accent border-accent text-xs sm:text-sm">
                      Media Strategy Veteran
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Floating credential cards - hidden on mobile to prevent overlap */}
            <Card className="hidden md:block absolute -top-4 lg:-top-6 -right-4 lg:-right-6 bg-background shadow-accent border-0 p-3 lg:p-4 max-w-40 lg:max-w-48">
              <div className="text-center">
                <Award className="w-6 h-6 lg:w-8 lg:h-8 text-accent mx-auto mb-2" />
                <div className="text-xs lg:text-sm font-semibold text-foreground">Certified</div>
                <div className="text-xs text-muted-foreground">PR Professional</div>
              </div>
            </Card>

            <Card className="hidden md:block absolute -bottom-4 lg:-bottom-6 -left-4 lg:-left-6 bg-background shadow-accent border-0 p-3 lg:p-4 max-w-40 lg:max-w-48">
              <div className="text-center">
                <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-accent mx-auto mb-2" />
                <div className="text-xs lg:text-sm font-semibold text-foreground">Featured In</div>
                <div className="text-xs text-muted-foreground">Major Publications</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;