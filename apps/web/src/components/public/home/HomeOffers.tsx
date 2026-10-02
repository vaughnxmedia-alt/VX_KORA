import { Link } from "react-router-dom";
import { SectionHeader } from "@/components/public/SectionHeader";
import { OfferCard } from "@/components/public/OfferCard";
import { coreOffers } from "@/content/offers";

export function HomeOffers() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 border-b border-border">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <SectionHeader
            eyebrow="Core offers"
            title="Counsel first. Execution when it serves the strategy."
          />
          <Link to="/work-with-us" className="text-sm font-medium text-primary hover:underline shrink-0">
            View all offers →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {coreOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} variant="compact" />
          ))}
        </div>
      </div>
    </section>
  );
}
