import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Brain, Rocket, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const IntroSection = () => {
  const navigate = useNavigate();
  const features = [
    {
      icon: Target,
      title: "Crystal Clear Targeting",
      description: "Know exactly who you're talking to and what makes them tick"
    },
    {
      icon: Brain,
      title: "Strategic Messaging",
      description: "Speak your audience's language with confidence and clarity"
    },
    {
      icon: Rocket,
      title: "Growth-Focused Results",
      description: "Turn brand clarity into real business growth and revenue"
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            I Help Visionary Entrepreneurs Build Brands That Actually Connect
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            You have the vision. You know your business can change lives. But when it comes to 
            explaining WHO you serve and HOW you're different, the words just... aren't there. 
            That's where I come in.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-professional hover:shadow-accent transition-all duration-300 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-primary rounded-2xl p-8 md:p-12 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Stop Guessing and Start Growing?
          </h3>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            My blueprint reports give you the strategic foundation you need to build a brand 
            that attracts your perfect customers and converts them into loyal advocates.
          </p>
          
        </div>
      </div>
    </section>
  );
};

export default IntroSection;