import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { BriefPromotionPost } from "@/lib/brief-homepage-promotion";
import { cn } from "@/lib/utils";

export type FeaturedInsightSlide = {
  category: string;
  article: BriefPromotionPost;
};

const AUTOPLAY_MS = 7000;

type FeaturedInsightsCarouselProps = {
  slides: FeaturedInsightSlide[];
  onReadArticle: (article: BriefPromotionPost) => void;
};

export function FeaturedInsightsCarousel({
  slides,
  onReadArticle,
}: FeaturedInsightsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const pauseAutoplay = useCallback(() => setIsPaused(true), []);
  const resumeAutoplay = useCallback(() => setIsPaused(false), []);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || isPaused || slides.length <= 1) return;

    const timer = window.setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [api, isPaused, slides.length]);

  if (slides.length === 0) return null;

  const scrollTo = (index: number) => api?.scrollTo(index);

  return (
    <div
      className="relative mx-auto max-w-4xl"
      onMouseEnter={pauseAutoplay}
      onMouseLeave={resumeAutoplay}
      onPointerDown={pauseAutoplay}
      onPointerUp={resumeAutoplay}
      onPointerCancel={resumeAutoplay}
    >
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: slides.length > 1,
          duration: 28,
          dragFree: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {slides.map((slide) => (
            <CarouselItem key={`${slide.category}-${slide.article.id}`} className="pl-0">
              <article className="overflow-hidden">
                <div className="relative aspect-[940/788] w-full overflow-hidden rounded-xl bg-muted sm:rounded-2xl">
                  {slide.article.cover_image_url ? (
                    <img
                      src={slide.article.cover_image_url}
                      alt={slide.article.title}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-muted to-gold/10" />
                  )}

                  {slides.length > 1 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Previous featured insight"
                        className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border-background/50 bg-background/90 shadow-md backdrop-blur-sm hover:bg-background sm:left-4 sm:h-10 sm:w-10"
                        onClick={() => api?.scrollPrev()}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Next featured insight"
                        className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border-background/50 bg-background/90 shadow-md backdrop-blur-sm hover:bg-background sm:right-4 sm:h-10 sm:w-10"
                        onClick={() => api?.scrollNext()}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="px-1 pt-6 text-center sm:px-2 sm:pt-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-dark">
                    {slide.category}
                  </p>
                  <h3 className="mt-3 font-serif text-2xl font-bold leading-[1.15] text-primary sm:text-3xl md:text-4xl">
                    {slide.article.title}
                  </h3>
                  <p className="mx-auto mt-4 max-w-2xl line-clamp-3 text-base leading-relaxed text-muted-foreground sm:line-clamp-4">
                    {slide.article.description}
                  </p>
                  <div className="mt-8">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-primary/20 px-8 hover:border-primary/40 hover:bg-primary/5"
                      onClick={() => onReadArticle(slide.article)}
                    >
                      Read Article
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {slides.length > 1 && (
        <div
          className="mt-8 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Featured insights slides"
        >
          {slides.map((slide, index) => (
            <button
              key={`${slide.category}-dot-${slide.article.id}`}
              type="button"
              role="tab"
              aria-label={`Go to ${slide.category} insight`}
              aria-selected={index === selectedIndex}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === selectedIndex
                  ? "w-7 bg-gold"
                  : "w-2 bg-primary/20 hover:bg-primary/35",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
