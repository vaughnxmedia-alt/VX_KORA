import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WelcomeTheBrief = () => {
  const navigate = useNavigate();

  return (
    <section id="welcome-the-brief" className="py-24 px-6 bg-background border-b border-border/40">
      <div className="max-w-3xl mx-auto">
        <Card className="border border-border/50 shadow-sm bg-background">
          <CardContent className="p-10 md:p-14 text-center">
            <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-6">
              The Brief
            </div>
            
            <h3 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-foreground">
              Welcome to The Brief
            </h3>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              This is where our thinking lives.<br />
              The Brief contains foundational insights, strategic perspectives, and principles that shape how authority is built over time.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate('/the-brief')}
                className="h-12 px-8"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Read The Brief
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default WelcomeTheBrief;
