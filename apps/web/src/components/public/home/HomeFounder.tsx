import { useState } from "react";
import { Link } from "react-router-dom";
import { firmProfile } from "@/content/firm";
import { Spread } from "./Spread";

export function HomeFounder() {
  const [missing, setMissing] = useState(false);

  return (
    <Spread folio="05" kicker="The Founder" layer={5} id="founder">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <figure className="mx-auto w-full max-w-[280px] lg:col-span-4 lg:mx-0 lg:max-w-none lg:pt-8">
          {missing ? (
            <div className="flex aspect-[819/1024] items-end border border-border bg-primary p-6">
              <span className="font-serif text-5xl text-primary-foreground">JV</span>
            </div>
          ) : (
            <img
              src={firmProfile.founderPhoto}
              alt={`Portrait of ${firmProfile.founderName}`}
              width={819}
              height={1024}
              className="h-auto w-full border border-border"
              onError={() => setMissing(true)}
            />
          )}
          <figcaption className="mt-5 text-center">
            <blockquote className="font-serif text-[1.05rem] leading-snug text-foreground">
              <p>“Attention expires.</p>
              <p>Positioning compounds.”</p>
            </blockquote>
            <p className="font-signature mt-6 text-[2.7rem] leading-none text-primary">Jocelyn Vaughn</p>
          </figcaption>
        </figure>

        <div className="lg:col-span-7 lg:col-start-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-dark">
            {firmProfile.founderTitle}
          </p>
          <h2 className="mt-4 font-serif text-[clamp(3rem,6vw,5.4rem)] font-medium leading-[0.9] tracking-tight">
            {firmProfile.founderName}
          </h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">{firmProfile.founderBio[0]}</p>
          <Link
            to="/about"
            className="mt-8 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground"
          >
            About the firm
            <span className="h-px w-8 bg-gold-dark" />
          </Link>
        </div>
      </div>
    </Spread>
  );
}
