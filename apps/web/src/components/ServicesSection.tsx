import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ServicesSection = () => {
  const navigate = useNavigate();
  const services = [
    {
      icon: Crown,
      title: "Brand Takeover Blueprint",
      price: "$250",
      badge: "Complete Package",
      description: "Comprehensive Target Audience Analysis and Brand Identity & Strategy Blueprint to transform your brand foundation.",
      features: [
        "Detailed customer persona profiles",
        "Emotional trigger analysis",
        "Complete brand foundation",
        "Unique value proposition",
        "Professional brand voice guide",
        "Content language guide",
        "Platform-specific strategies",
        "Ready-to-use pitch lines"
      ]
    }
  ];

  return (
    <section id="services" className="py-8 sm:py-12 md:py-16 lg:py-20 px-4 bg-gradient-subtle">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16 lg:mb-20">
          <Badge variant="outline" className="mb-4 text-accent border-accent">
            Strategic Blueprints
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 leading-tight">
            Buy a Blueprint, Build Your Brand
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Get the strategic foundation every successful brand needs. Each blueprint is 
            custom-crafted to give you clarity, confidence, and a clear path forward.
          </p>
        </div>

        <div className="max-w-sm sm:max-w-md md:max-w-lg mx-auto mb-12 md:mb-16">
          {services.map((service, index) => (
            <Card key={index} className="relative border-0 shadow-professional hover:shadow-accent transition-all duration-500 group bg-background">
              {service.badge && (
                <Badge className="absolute -top-3 left-4 md:left-6 bg-accent text-accent-foreground font-semibold px-3 md:px-4 py-1 text-xs md:text-sm">
                  {service.badge}
                </Badge>
              )}
              
              <CardContent className="p-6 md:p-8">
                <div className="text-center mb-6 md:mb-8">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                    <service.icon className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-accent-foreground" />
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                    {service.title}
                  </h3>
                  
                  <div className="mb-3 md:mb-4">
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <span className="text-2xl font-bold text-muted-foreground line-through">$500</span>
                      <span className="text-3xl sm:text-4xl font-bold text-accent">$250</span>
                    </div>
                    <div className="text-sm font-semibold text-accent">50% OFF</div>
                  </div>
                  
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 md:mb-6">
                    {service.description}
                  </p>
                </div>

                <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                  {service.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-2 md:gap-3">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base text-foreground/80 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  variant="hero" 
                  size="lg" 
                  className="w-full group-hover:scale-105 transition-transform duration-300 text-sm sm:text-base"
                  onClick={() => navigate('/brand-blueprint')}
                >
                  Get Your Brand Takeover Blueprint
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};

export default ServicesSection;