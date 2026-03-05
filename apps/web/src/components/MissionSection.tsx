import { Badge } from "@/components/ui/badge";
const MissionSection = () => {
  return <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-4 bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 md:mb-8 leading-tight">
            Where Vision Meets Strategic Precision
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 md:mb-16">
            I'm Jah, a brand strategist and publicist with over 7 years of experience helping visionary entrepreneurs transform their big ideas into brands that actually connect and convert.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 text-left">
          <div className="space-y-4 md:space-y-6">
            
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              My Mission
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              To bridge the gap between having a powerful vision and knowing exactly how to communicate it. I believe every entrepreneur deserves clarity, confidence, and a strategic foundation that turns their passion into profit. Seen, Heard, and Remembered.
            </p>
          </div>

          <div className="space-y-4 md:space-y-6">
            
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Why I Created These Blueprints
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              After years of working with clients, I noticed the same pattern: brilliant entrepreneurs with world-changing ideas who struggled to articulate their value. These reports solve that problem with publicist-level strategy at an accessible price point.
            </p>
          </div>
        </div>
      </div>
    </section>;
};
export default MissionSection;