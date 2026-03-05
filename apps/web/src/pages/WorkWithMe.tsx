import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Users, Target, Mic, ArrowLeft, Building, Search, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";

const services = [
  {
    icon: Target,
    title: "Brand Strategy Services",
    description: "Complete brand overhaul with strategic positioning, messaging framework, and go-to-market strategy.",
    features: [
      "3-month brand strategy intensive",
      "Complete brand audit and competitive analysis",
      "Messaging hierarchy and brand voice development",
      "Content strategy and campaign planning",
      "Monthly strategy sessions"
    ],
    price: "Starting at $3,500",
    duration: "3 months"
  },
  {
    icon: Mic,
    title: "Launch PR + Media Coaching",
    description: "Get ready for the spotlight with media training, PR strategy, and launch campaign support.",
    features: [
      "Media training and interview prep",
      "Press kit development",
      "Launch strategy and timeline",
      "Media outreach and relationship building",
      "Crisis communication planning"
    ],
    price: "Starting at $2,500",
    duration: "6 weeks"
  },
  {
    icon: Users,
    title: "Ongoing PR Retainer",
    description: "Monthly PR support to keep your brand visible and growing in the marketplace.",
    features: [
      "Monthly PR strategy and execution",
      "Media outreach and placement",
      "Thought leadership content",
      "Speaking opportunity coordination",
      "Monthly performance reporting"
    ],
    price: "$1,500/month",
    duration: "Ongoing"
  }
];

const alaCarteServices = [
  {
    icon: Building,
    title: "Production Services",
    description: "Professional production services for your brand projects and campaigns.",
    price: "$175",
    priceUnit: "per hour",
    features: [
      "Project management and coordination",
      "Creative production oversight",
      "Quality assurance and delivery",
      "Flexible scheduling available"
    ]
  },
  {
    icon: Search,
    title: "Website Development",
    description: "Custom websites tailored to your brand and business objectives.",
    price: "$300 - $2,000",
    priceUnit: "starting price",
    features: [
      "Responsive design and development",
      "SEO optimization included",
      "Content management system",
      "Mobile-first approach"
    ]
  },
  {
    icon: Palette,
    title: "Graphic Design",
    description: "Professional design services for all your brand and marketing needs.",
    price: "Custom Quote",
    priceUnit: "per project",
    features: [
      "Brand assets and identity design",
      "Marketing materials creation",
      "Production graphics",
      "Print and digital formats"
    ]
  }
];

const WorkWithMe = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      <div className="fixed top-24 left-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
      {/* Header */}
      <section className="bg-gradient-to-r from-primary to-primary/90 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Let's Build Your Brand Like a Publicist Would
          </h1>
          <p className="text-xl text-white/90 leading-relaxed">
            Ready to go beyond DIY? Work directly with me to build a brand strategy 
            that positions you as the go-to expert in your industry.
          </p>
        </div>
      </section>

      {/* À La Carte Services Section - Now at top */}
      <section className="pt-8 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              À La Carte Services
            </h2>
            <p className="text-xl text-muted-foreground">
              Select individual services tailored to your specific needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {alaCarteServices.map((service, index) => (
              <Card key={index} className="border-0 shadow-professional hover:shadow-accent transition-all duration-300 group h-full flex flex-col">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <service.icon className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {service.title}
                  </CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6 flex-grow flex flex-col">
                  <div className="flex-grow">
                    <h4 className="font-semibold text-foreground mb-3">What's Included:</h4>
                    <ul className="space-y-2">
                      {service.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-4 mt-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-accent">{service.price}</div>
                        <div className="text-sm text-muted-foreground">{service.priceUnit}</div>
                      </div>
                    </div>
                    
                    <Button variant="cta" className="w-full" size="lg">
                      Get Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact CTA for À La Carte */}
          <Card className="border-0 shadow-accent bg-gradient-subtle">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-semibold mb-4">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-6">
                Contact us to discuss your specific needs and get a custom quote for your project.
              </p>
              <Button variant="hero" size="lg">
                Contact for Custom Quote
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main Services */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Comprehensive Brand Services
            </h2>
            <p className="text-xl text-muted-foreground">
              Full-service brand strategy and PR packages for complete transformation
            </p>
          </div>
          
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {services.map((service, index) => (
              <Card key={index} className="border-0 shadow-professional hover:shadow-accent transition-all duration-300 group h-full flex flex-col">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <service.icon className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {service.title}
                  </CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6 flex-grow flex flex-col">
                  <div className="flex-grow">
                    <h4 className="font-semibold text-foreground mb-3">What's Included:</h4>
                    <ul className="space-y-2">
                      {service.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-4 mt-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-accent">{service.price}</div>
                        <div className="text-sm text-muted-foreground">{service.duration}</div>
                      </div>
                    </div>
                    
                    <Button variant="cta" className="w-full" size="lg">
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 1:1 Call CTA */}
          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-accent bg-gradient-subtle">
              <CardContent className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-accent-foreground" />
                </div>
                
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  Not Sure Which Service is Right for You?
                </h3>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Book a 1:1 Brand Clarity Call and let's map out exactly what your brand needs 
                  to go from "just another business" to "the obvious choice."
                </p>

                <div className="bg-white rounded-xl p-6 mb-8 max-w-md mx-auto shadow-professional">
                  <div className="text-2xl font-bold text-accent mb-2">$150</div>
                  <div className="text-muted-foreground mb-4">60-minute strategy session</div>
                  <ul className="text-left space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Brand audit and gap analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Custom action plan
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Service recommendations
                    </li>
                  </ul>
                </div>

                <Button variant="hero" size="lg" className="group">
                  Book Your Brand Clarity Call
                  <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              My Strategic Process
            </h2>
            <p className="text-xl text-muted-foreground">
              How we'll transform your brand from confused to confident
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Discovery", description: "Deep dive into your vision, audience, and goals" },
              { step: "02", title: "Strategy", description: "Build your custom brand blueprint and messaging framework" },
              { step: "03", title: "Implementation", description: "Launch your new brand with confidence and clarity" },
              { step: "04", title: "Growth", description: "Scale with ongoing support and strategic adjustments" }
            ].map((phase, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-accent-foreground">{phase.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{phase.title}</h3>
                <p className="text-muted-foreground">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default WorkWithMe;