import type { InspiredTemplate } from "./types";
import { layoutColumnsWithNotes } from "./helpers";

export const campaignTemplates: InspiredTemplate[] = [
  {
    id: "event-planning-board",
    name: "Event Planning Board",
    category: "Campaign",
    description: "Structured framework for event theme, audience, run of show, promotion, sponsors, and budget.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        {
          title: "Theme",
          prompts: [
            "Event theme and core concept",
            "Visual identity and key messages",
            "Tone and atmosphere",
          ],
        },
        {
          title: "Audience",
          prompts: [
            "Primary and secondary audiences",
            "Attendance goals and capacity",
            "Accessibility and inclusion notes",
          ],
        },
        {
          title: "Run of Show",
          prompts: [
            "Opening and welcome",
            "Key sessions and timing",
            "Closing and follow-up",
          ],
        },
        {
          title: "Promotion Timeline",
          prompts: [
            "Save-the-date and launch",
            "Mid-campaign pushes",
            "Last-chance and day-of",
          ],
        },
        {
          title: "Sponsors",
          prompts: [
            "Sponsor tiers and benefits",
            "Activation ideas",
            "Recognition and thank-yous",
          ],
        },
        {
          title: "Budget",
          prompts: [
            "Venue and production",
            "Marketing and promotion",
            "Contingency and reserves",
          ],
        },
      ]),
  },
  {
    id: "full-campaign-launch-blueprint",
    name: "Full Campaign Launch Blueprint",
    category: "Campaign",
    description: "End-to-end launch plan: objectives, channels, creative, timeline, and measurement.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Objectives", prompts: ["Business goal", "Audience goal", "Success metrics"] },
        { title: "Channels", prompts: ["Owned", "Earned", "Paid", "Partners"] },
        { title: "Creative", prompts: ["Hero concept", "Adaptations", "UGC hooks"] },
        { title: "Timeline", prompts: ["Pre-launch", "Launch", "Sustain", "Wrap"] },
        { title: "Measurement", prompts: ["KPIs", "Reporting cadence", "Optimization triggers"] },
      ]),
  },
  {
    id: "pr-rollout-strategy-map",
    name: "PR Rollout Strategy Map",
    category: "Campaign",
    description: "Press, messaging, spokespeople, and timeline for a controlled PR rollout.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Key Messages", prompts: ["Headline message", "Proof points", "Quotes and soundbites"] },
        { title: "Media Targets", prompts: ["Tier 1 outlets", "Tier 2 and trade", "Bloggers and influencers"] },
        { title: "Spokespeople", prompts: ["Primary spokesperson", "Backups", "Training and Q&A"] },
        { title: "Rollout Phases", prompts: ["Embargo and exclusives", "Broad release", "Follow-up and sustain"] },
        { title: "Crisis Lines", prompts: ["Holding statements", "Escalation path", "Legal and compliance"] },
      ]),
  },
  {
    id: "product-launch-war-room",
    name: "Product Launch War Room",
    category: "Campaign",
    description: "War room structure for product launch: milestones, owners, blockers, and comms.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Milestones", prompts: ["Launch date", "Key gates", "Go/no-go criteria"] },
        { title: "Owners", prompts: ["Marketing lead", "PR lead", "Product/comms"] },
        { title: "Blockers", prompts: ["Current blockers", "Risks", "Dependencies"] },
        { title: "Comms", prompts: ["Internal comms", "Customer comms", "Press and partners"] },
        { title: "Post-Launch", prompts: ["Day 1 checklist", "Week 1 review", "Retro and learnings"] },
      ]),
  },
  {
    id: "content-series-builder",
    name: "Content Series Builder",
    category: "Campaign",
    description: "Plan a content series: concept, episodes, cadence, and distribution.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Concept", prompts: ["Series premise", "Target audience", "Format and length"] },
        { title: "Episodes", prompts: ["Episode 1 focus", "Episode 2 focus", "Episode 3+ focus"] },
        { title: "Cadence", prompts: ["Publish schedule", "Production lead time", "Buffer and flex"] },
        { title: "Distribution", prompts: ["Primary channels", "Repurposing plan", "Promotion plan"] },
        { title: "Success", prompts: ["Series KPIs", "Per-episode metrics", "Iteration triggers"] },
      ]),
  },
];
