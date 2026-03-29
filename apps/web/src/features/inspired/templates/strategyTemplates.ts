import type { InspiredTemplate } from "./types";
import { layoutColumnsWithNotes } from "./helpers";

export const strategyTemplates: InspiredTemplate[] = [
  {
    id: "audience-deep-dive-board",
    name: "Audience Deep Dive Board",
    category: "Strategy",
    description: "Segment, needs, behaviors, and messaging for your audience.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Segments", prompts: ["Primary segment", "Secondary", "Excluded"] },
        { title: "Needs & Pains", prompts: ["Jobs to be done", "Pain points", "Gains"] },
        { title: "Behaviors", prompts: ["Where they are", "What they consume", "How they decide"] },
        { title: "Messaging", prompts: ["Value prop", "Proof points", "Objection handlers"] },
      ]),
  },
  {
    id: "competitive-landscape-map",
    name: "Competitive Landscape Map",
    category: "Strategy",
    description: "Map competitors, positioning, and differentiation.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Competitors", prompts: ["Direct competitors", "Indirect", "Alternatives"] },
        { title: "Positioning", prompts: ["Their message", "Their audience", "Their proof"] },
        { title: "Gaps", prompts: ["Underserved needs", "Messaging gaps", "Channel gaps"] },
        { title: "Our Edge", prompts: ["Differentiation", "Unique proof", "Positioning statement"] },
      ]),
  },
  {
    id: "kora-research-command-center",
    name: "KORA Research Command Center",
    category: "Strategy",
    description: "Research questions, sources, and KORA-driven insights.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Research Questions", prompts: ["Primary question", "Secondary questions", "Success definition"] },
        { title: "Data Sources", prompts: ["KORA reports", "Internal data", "External sources"] },
        { title: "Insights", prompts: ["Key finding 1", "Key finding 2", "Key finding 3"] },
        { title: "Actions", prompts: ["Recommendation 1", "Recommendation 2", "Next steps"] },
      ]),
    aiPrompts: {
      contextBuilder: "User is setting up a KORA research command center for campaign or brand strategy.",
      recommendedQueries: ["Summarize KORA report for campaign X", "Compare performance across segments", "Recommend next content themes"],
    },
  },
  {
    id: "viral-content-deconstruction-board",
    name: "Viral Content Deconstruction Board",
    category: "Strategy",
    description: "Deconstruct what works: format, hook, audience, and replication.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Example 1", prompts: ["Format and length", "Hook and CTA", "Why it worked"] },
        { title: "Example 2", prompts: ["Format and length", "Hook and CTA", "Why it worked"] },
        { title: "Patterns", prompts: ["Common formats", "Common hooks", "Audience overlap"] },
        { title: "Replication", prompts: ["Our version concept", "Adaptations", "Test plan"] },
      ]),
  },
];
