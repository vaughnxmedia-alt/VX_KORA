import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ciApi } from "../api";
import { ciFriendlyError, parseSocialChannels, parseSpokespersons } from "../workspace";
import {
  CI_ORG_TYPE_LABELS,
  CI_ORG_TYPES,
  type CiOrganizationType,
  type CiOrgProfileInput,
} from "../types";

const STEPS = [
  "Confirm the organization",
  "Who you speak to",
  "What needs care",
  "People and presence",
] as const;

export function CiPortalOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;
  const [step, setStep] = useState(0);

  const { data: memberships = [] } = useQuery({
    queryKey: ["ci", "portal", "memberships", user?.id],
    queryFn: () => ciApi.portal.listMemberships(user!.id),
    enabled: Boolean(user?.id),
  });
  const selectedId =
    orgId && memberships.some((m) => m.organization_id === orgId)
      ? orgId
      : memberships[0]?.organization_id;

  const { data: organization, isLoading } = useQuery({
    queryKey: ["ci", "organizations", selectedId],
    queryFn: () => ciApi.organizations.get(selectedId!),
    enabled: Boolean(selectedId),
  });

  const [name, setName] = useState("");
  const [organizationType, setOrganizationType] = useState<CiOrganizationType | "">("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [audiences, setAudiences] = useState("");
  const [goals, setGoals] = useState("");
  const [challenges, setChallenges] = useState("");
  const [mediaConcerns, setMediaConcerns] = useState("");
  const [reputation, setReputation] = useState("");
  const [events, setEvents] = useState("");
  const [spokespeople, setSpokespeople] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [otherSocial, setOtherSocial] = useState("");
  const [hasMessaging, setHasMessaging] = useState<"yes" | "no" | "unsure">("unsure");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!organization || hydrated) return;
    const social = parseSocialChannels(organization.social_channels);
    const people = parseSpokespersons(organization.key_spokespersons);
    setName(organization.name || "");
    setOrganizationType(organization.organization_type || "");
    setIndustry(organization.industry || "");
    setWebsite(organization.website || "");
    setLocation(organization.location || "");
    setDescription(organization.description || "");
    setAudiences(organization.primary_audiences || "");
    setGoals(organization.communication_goals || "");
    setChallenges(organization.major_challenges || "");
    setMediaConcerns(organization.pr_media_concerns || "");
    setReputation(organization.reputation_concerns || "");
    setEvents(organization.upcoming_events || "");
    setSpokespeople(people.map((p) => (p.role ? `${p.name} — ${p.role}` : p.name)).join("\n"));
    setInstagram(social.instagram || "");
    setFacebook(social.facebook || "");
    setLinkedin(social.linkedin || "");
    setTiktok(social.tiktok || "");
    setOtherSocial(social.other || "");
    setHasMessaging(
      organization.has_approved_messaging === true
        ? "yes"
        : organization.has_approved_messaging === false
          ? "no"
          : "unsure",
    );
    setHydrated(true);
  }, [hydrated, organization]);

  const payload = useMemo((): CiOrgProfileInput => {
    const people = spokespeople
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [namePart, role] = line.split("—").map((part) => part.trim());
        return { name: namePart, role };
      });
    return {
      name,
      organization_type: organizationType || null,
      industry,
      website,
      location,
      description,
      primary_audiences: audiences,
      communication_goals: goals,
      major_challenges: challenges,
      upcoming_events: events,
      pr_media_concerns: mediaConcerns,
      reputation_concerns: reputation,
      key_spokespersons: people,
      social_channels: { instagram, facebook, linkedin, tiktok, other: otherSocial },
      has_approved_messaging: hasMessaging === "unsure" ? null : hasMessaging === "yes",
    };
  }, [
    audiences,
    challenges,
    description,
    events,
    facebook,
    goals,
    hasMessaging,
    industry,
    instagram,
    linkedin,
    location,
    mediaConcerns,
    name,
    organizationType,
    otherSocial,
    reputation,
    spokespeople,
    tiktok,
    website,
  ]);

  const save = useMutation({
    mutationFn: async (complete: boolean) => {
      if (!selectedId) throw new Error("Organization not found.");
      if (!name.trim()) throw new Error("Please confirm the organization name.");
      return ciApi.organizations.saveProfile(selectedId, {
        ...payload,
        onboarding_status: complete ? "completed" : "in_progress",
      });
    },
    onSuccess: async (_org, complete) => {
      await qc.invalidateQueries({ queryKey: ["ci", "organizations", selectedId] });
      await qc.invalidateQueries({ queryKey: ["ci", "portal"] });
      if (complete) {
        toast.success("Thank you. JahKnowsPR can use this to brief the organization.");
        navigate({ pathname: "/portal", search: selectedId ? `?org=${selectedId}` : "" });
      } else {
        toast.success("Progress saved.");
      }
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  if (isLoading || !organization) {
    return <p className="text-sm text-muted-foreground">Preparing your organization profile…</p>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          Welcome to JahKnowsPR
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          A few things so we can brief you well.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Confirm {organization.name}, then share only what helps us understand the communications
          situation. You can save and come back.
        </p>
      </header>

      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Onboarding steps">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={
              index === step
                ? "rounded-full border border-primary px-3 py-1 text-primary"
                : "rounded-full border border-border px-3 py-1 text-muted-foreground"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <form
        className="space-y-5 rounded-lg border border-border bg-background p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) {
            save.mutate(false);
            setStep((value) => value + 1);
            return;
          }
          save.mutate(true);
        }}
      >
        {step === 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-name">Organization name</Label>
              <Input id="ci-onboard-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ci-onboard-type">Organization type</Label>
                <Select
                  value={organizationType}
                  onValueChange={(value) => setOrganizationType(value as CiOrganizationType)}
                >
                  <SelectTrigger id="ci-onboard-type">
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_ORG_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CI_ORG_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-onboard-industry">Industry</Label>
                <Input id="ci-onboard-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ci-onboard-website">Website</Label>
                <Input id="ci-onboard-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-onboard-location">Location</Label>
                <Input id="ci-onboard-location" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-description">Short description</Label>
              <Textarea
                id="ci-onboard-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this organization do, in plain language?"
              />
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-audiences">Who do you most need to reach?</Label>
              <Textarea
                id="ci-onboard-audiences"
                rows={4}
                value={audiences}
                onChange={(e) => setAudiences(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-goals">What should communications help you do?</Label>
              <Textarea
                id="ci-onboard-goals"
                rows={4}
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-challenges">Biggest communications challenges</Label>
              <Textarea
                id="ci-onboard-challenges"
                rows={4}
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-media">Current PR or media concerns</Label>
              <Textarea
                id="ci-onboard-media"
                rows={3}
                value={mediaConcerns}
                onChange={(e) => setMediaConcerns(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-reputation">Reputation concerns, if any</Label>
              <Textarea
                id="ci-onboard-reputation"
                rows={3}
                value={reputation}
                onChange={(e) => setReputation(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-spokes">Key spokespersons</Label>
              <Textarea
                id="ci-onboard-spokes"
                rows={3}
                value={spokespeople}
                onChange={(e) => setSpokespeople(e.target.value)}
                placeholder={"One per line, e.g. Jordan Hale — Founder"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-events">Important upcoming dates or events</Label>
              <Textarea
                id="ci-onboard-events"
                rows={3}
                value={events}
                onChange={(e) => setEvents(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ci-onboard-ig">Instagram</Label>
                <Input id="ci-onboard-ig" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-onboard-fb">Facebook</Label>
                <Input id="ci-onboard-fb" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-onboard-li">LinkedIn</Label>
                <Input id="ci-onboard-li" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-onboard-tt">TikTok</Label>
                <Input id="ci-onboard-tt" value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-onboard-other">Other social or web presence</Label>
              <Input id="ci-onboard-other" value={otherSocial} onChange={(e) => setOtherSocial(e.target.value)} />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Do you already have approved messaging?</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {(
                  [
                    ["yes", "Yes"],
                    ["no", "Not yet"],
                    ["unsure", "Not sure"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="approved-messaging"
                      checked={hasMessaging === value}
                      onChange={() => setHasMessaging(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>
              Back
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save progress"}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {step === STEPS.length - 1 ? "Finish and enter the portal" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CiPortalOnboardingPage;
