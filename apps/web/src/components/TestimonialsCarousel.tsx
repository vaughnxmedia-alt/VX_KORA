import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { useState, useEffect } from "react";

const testimonials = [
  {
    id: 1,
    name: "Sarah Martinez",
    role: "CEO, TechStart Solutions",
    content: "Jah's Target Audience Analysis completely changed our marketing approach. We went from confused messaging to crystal-clear communication that converts. Our engagement increased 300% in just two months.",
    rating: 5,
    image: "👩🏽‍💼"
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Founder, EcoLiving Brand",
    content: "The Brand Identity Report was worth every penny. Jah didn't just give us a brand voice - she gave us a complete personality that our customers instantly connect with. Game changer!",
    rating: 5,
    image: "👨🏻‍💻"
  },
  {
    id: 3,
    name: "Ashley Johnson",
    role: "Marketing Director, Wellness Co",
    content: "The Full Visionary Brand Blueprint is pure gold. It's like having a senior brand strategist on your team. The messaging strategy alone generated 5 new high-value clients in one month.",
    rating: 5,
    image: "👩🏾‍💼"
  },
  {
    id: 4,
    name: "David Rodriguez",
    role: "Creative Director, Studio Fresh",
    content: "Jah's Custom Audit Video was incredibly insightful. She spotted things about our Instagram strategy that we completely missed. The real-time feedback was like having a personal PR consultant.",
    rating: 5,
    image: "👨🏽‍🎨"
  }
];

const TestimonialsCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section id="testimonials" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            What My Clients Say
          </h2>
          <p className="text-xl text-muted-foreground">
            Real results from real entrepreneurs who invested in clarity
          </p>
        </div>

        <div className="relative overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                <Card className="bg-background shadow-professional border-0 max-w-4xl mx-auto">
                  <CardContent className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row items-start gap-8">
                      <div className="text-6xl">{testimonial.image}</div>
                      
                      <div className="flex-1">
                        <Quote className="w-8 h-8 text-accent mb-4" />
                        
                        <blockquote className="text-lg text-foreground/90 mb-6 leading-relaxed">
                          "{testimonial.content}"
                        </blockquote>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-foreground">
                              {testimonial.name}
                            </div>
                            <div className="text-muted-foreground">
                              {testimonial.role}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? "bg-accent" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;