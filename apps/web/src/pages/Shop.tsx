import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Video, Download } from "lucide-react";

const products = [
  {
    id: 1,
    title: "Target Audience Analysis",
    price: 97,
    badge: "Most Popular",
    description: "Finally understand who you're talking to. This report goes beyond 'demographics' and gives you emotional insight, content language, and audience personas that connect.",
    features: [
      "Custom persona profiles with emotional drivers",
      "Language guide for authentic communication",
      "Content direction and topic recommendations",
      "Pain points and desires deep-dive analysis",
      "Competitor audience analysis"
    ],
    deliverables: "15-page strategic report + bonus templates"
  },
  {
    id: 2,
    title: "Brand Identity Report",
    price: 147,
    badge: "Premium",
    description: "Get crystal clarity on your mission, vision, values, and brand voice. Plus your unique value proposition and ready-to-use pitch lines.",
    features: [
      "Mission, vision & values framework",
      "Unique Value Proposition (UVP) development",
      "Brand voice and personality guide",
      "Signature pitch lines and taglines",
      "Social media bio templates",
      "Brand archetype analysis"
    ],
    deliverables: "20-page comprehensive brand guide"
  },
  {
    id: 3,
    title: "Full Visionary Brand Blueprint",
    price: 297,
    badge: "Best Value",
    description: "The complete package! Both reports PLUS messaging strategy, your signature 'Uber Pitch,' and starter content prompts to launch with confidence.",
    features: [
      "Everything from Target Audience Analysis",
      "Everything from Brand Identity Report",
      "Complete messaging strategy framework",
      "Signature 'Uber Pitch' development",
      "30 starter content prompts",
      "Brand positioning strategy",
      "Competitive differentiation guide"
    ],
    deliverables: "40+ page strategic blueprint + bonus resources"
  },
  {
    id: 4,
    title: "Custom Audit Video",
    price: 49,
    badge: "Add-On",
    description: "A 10-minute screen-recorded video of me reviewing your Instagram or website with real-time insights and actionable recommendations.",
    features: [
      "Live screen-recorded review",
      "Instagram or website audit",
      "Real-time strategic insights",
      "Immediate improvement recommendations",
      "Personalized action steps"
    ],
    deliverables: "10-minute custom video + summary notes"
  }
];

const Shop = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-hero text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Buy a Blueprint
          </h1>
          <p className="text-xl text-white/80 leading-relaxed">
            Stop guessing about your brand strategy. Get the strategic clarity you need 
            to build a business that attracts your perfect customers and converts them into advocates.
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mb-12">
            {products.slice(0, 3).map((product) => (
              <Card key={product.id} className={`border-0 shadow-professional hover:shadow-accent transition-all duration-300 relative ${
                product.badge === "Best Value" ? "lg:col-span-2" : ""
              }`}>
                {product.badge && (
                  <Badge className="absolute -top-3 left-6 bg-gradient-accent text-accent-foreground font-semibold">
                    {product.badge}
                  </Badge>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold text-foreground">
                      {product.title}
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-accent">
                        ${product.price}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">What's Included:</h4>
                    <ul className="space-y-2">
                      {product.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Download className="w-4 h-4 text-accent" />
                      <span className="font-medium text-foreground">You'll Receive:</span>
                    </div>
                    <p className="text-muted-foreground">{product.deliverables}</p>
                  </div>

                  <Button variant="cta" className="w-full" size="lg">
                    Get This Blueprint - ${product.price}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add-on product */}
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-professional hover:shadow-accent transition-all duration-300 relative">
              <Badge className="absolute -top-3 left-6 bg-secondary text-secondary-foreground">
                {products[3].badge}
              </Badge>
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-8 h-8 text-accent" />
                    <CardTitle className="text-2xl font-bold text-foreground">
                      {products[3].title}
                    </CardTitle>
                  </div>
                  <div className="text-3xl font-bold text-accent">
                    ${products[3].price}
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {products[3].description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-3">What's Included:</h4>
                  <ul className="space-y-2">
                    {products[3].features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="w-4 h-4 text-accent" />
                    <span className="font-medium text-foreground">You'll Receive:</span>
                  </div>
                  <p className="text-muted-foreground">{products[3].deliverables}</p>
                </div>

                <Button variant="cta" className="w-full" size="lg">
                  Add Custom Video Review - ${products[3].price}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Trust signals */}
          <div className="text-center mt-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-accent text-accent" />
              ))}
              <span className="text-muted-foreground ml-2">Trusted by 500+ entrepreneurs</span>
            </div>
            <p className="text-muted-foreground">
              🔒 Secure checkout • 📧 Instant delivery • 💯 100% satisfaction guarantee
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Shop;