import type { InspiredTemplate } from "./types";
import { layoutColumnsWithNotes } from "./helpers";

export const businessTemplates: InspiredTemplate[] = [
  {
    id: "investor-pitch-visual-map",
    name: "Investor Pitch Visual Map",
    category: "Business",
    description: "Pitch structure: problem, solution, market, traction, and ask.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Problem", prompts: ["Problem statement", "Who feels it", "Size of problem"] },
        { title: "Solution", prompts: ["Product or service", "Key differentiator", "Why now"] },
        { title: "Market", prompts: ["TAM SAM SOM", "Go-to-market", "Competition"] },
        { title: "Traction", prompts: ["Metrics that matter", "Milestones", "Roadmap"] },
        { title: "Ask", prompts: ["Amount and use of funds", "Round details", "Next steps"] },
      ]),
  },
  {
    id: "brand-repositioning-board",
    name: "Brand Repositioning Board",
    category: "Business",
    description: "Current state, target position, and migration plan.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Current State", prompts: ["Current perception", "Strengths", "Gaps"] },
        { title: "Target Position", prompts: ["Desired perception", "Proof points", "Audience view"] },
        { title: "Migration", prompts: ["Key messages", "Channels and touchpoints", "Timeline"] },
        { title: "Risks", prompts: ["Internal resistance", "External confusion", "Mitigations"] },
      ]),
  },
  {
    id: "creator-monetization-map",
    name: "Creator Monetization Map",
    category: "Business",
    description: "Revenue streams, audience, and content strategy for creators.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Revenue Streams", prompts: ["Primary revenue", "Secondary", "Future ideas"] },
        { title: "Audience", prompts: ["Core audience", "Size and engagement", "Monetization readiness"] },
        { title: "Content", prompts: ["Content pillars", "Posting cadence", "Paid vs organic"] },
        { title: "Goals", prompts: ["Revenue target", "Milestones", "Partnerships"] },
      ]),
  },
  {
    id: "intern-campaign-lab",
    name: "Intern Campaign Lab",
    category: "Business",
    description: "Structured brief and feedback for intern-led campaigns.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Brief", prompts: ["Objective", "Audience", "Deliverables and deadline"] },
        { title: "Concept", prompts: ["Idea summary", "Key message", "Channel plan"] },
        { title: "Feedback", prompts: ["What works", "What to refine", "Next iteration"] },
        { title: "Learning", prompts: ["Skills practiced", "Resources used", "Retro notes"] },
      ]),
  },
];
