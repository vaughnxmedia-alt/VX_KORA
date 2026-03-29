import type { InspiredTemplate } from "./types";
import { layoutColumnsWithNotes } from "./helpers";

export const socialTemplates: InspiredTemplate[] = [
  {
    id: "30-day-content-calendar-builder",
    name: "30-Day Content Calendar Builder",
    category: "Social",
    description: "Plan a month of content: themes, formats, and posting schedule.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Themes", prompts: ["Week 1 theme", "Week 2 theme", "Week 3 theme", "Week 4 theme"] },
        { title: "Formats", prompts: ["Carousel ideas", "Reel/short ideas", "Stories and ephemeral"] },
        { title: "Schedule", prompts: ["Best posting times", "Cadence per platform", "Cross-posting plan"] },
        { title: "Metrics", prompts: ["Primary KPIs", "Benchmarks", "Review cadence"] },
      ]),
  },
  {
    id: "ad-creative-testing-board",
    name: "Ad Creative Testing Board",
    category: "Social",
    description: "Test structure: hypotheses, variants, and learnings.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Hypotheses", prompts: ["What we're testing", "Success criteria", "Audience and placement"] },
        { title: "Variants", prompts: ["Variant A (control)", "Variant B", "Variant C"] },
        { title: "Results", prompts: ["Performance summary", "Winner", "Statistical significance"] },
        { title: "Learnings", prompts: ["What we learned", "Next tests", "Creative principles"] },
      ]),
  },
  {
    id: "personal-brand-identity-map",
    name: "Personal Brand Identity Map",
    category: "Social",
    description: "Personal brand: positioning, voice, content pillars, and presence.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Positioning", prompts: ["Expertise and niche", "Unique POV", "Target audience"] },
        { title: "Voice", prompts: ["Tone and style", "Do and don't", "Sample phrases"] },
        { title: "Content Pillars", prompts: ["Pillar 1", "Pillar 2", "Pillar 3"] },
        { title: "Presence", prompts: ["Primary platform", "Secondary", "Consistency plan"] },
      ]),
  },
];
