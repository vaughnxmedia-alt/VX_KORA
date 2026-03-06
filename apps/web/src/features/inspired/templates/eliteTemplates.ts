import type { InspiredTemplate } from "./types";
import { layoutColumnsWithNotes } from "./helpers";

export const eliteTemplates: InspiredTemplate[] = [
  {
    id: "cultural-moment-strategy-board",
    name: "Cultural Moment Strategy Board",
    category: "Elite",
    description: "Capitalize on a cultural moment: signal, angle, and execution.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Moment", prompts: ["What's happening", "Why it matters", "Window of relevance"] },
        { title: "Angle", prompts: ["Our POV", "Connection to brand", "Risk assessment"] },
        { title: "Execution", prompts: ["Channels and format", "Spokespeople and partners", "Timeline"] },
        { title: "Measurement", prompts: ["Reach and sentiment", "Business impact", "Retro"] },
      ]),
  },
  {
    id: "crisis-response-map",
    name: "Crisis Response Map",
    category: "Elite",
    description: "Crisis structure: severity, stakeholders, messaging, and recovery.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Severity", prompts: ["Level and type", "Affected stakeholders", "Legal and compliance"] },
        { title: "Stakeholders", prompts: ["Internal", "Customers and public", "Partners and media"] },
        { title: "Messaging", prompts: ["Holding statement", "Key messages", "Q&A and escalation"] },
        { title: "Recovery", prompts: ["Short-term actions", "Long-term changes", "Post-crisis review"] },
      ]),
  },
  {
    id: "narrative-architecture-blueprint",
    name: "Narrative Architecture Blueprint",
    category: "Elite",
    description: "Master narrative: story, proof, and expression across touchpoints.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Story", prompts: ["Core narrative", "Hero and journey", "Transformation"] },
        { title: "Proof", prompts: ["Evidence and examples", "Testimonials", "Data and case studies"] },
        { title: "Expression", prompts: ["Brand voice", "Visual language", "Key phrases"] },
        { title: "Touchpoints", prompts: ["Website and owned", "Campaigns", "Sales and support"] },
      ]),
  },
  {
    id: "influencer-collaboration-matrix",
    name: "Influencer Collaboration Matrix",
    category: "Elite",
    description: "Influencer strategy: tiers, fit, deliverables, and measurement.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Tiers", prompts: ["Mega / macro", "Mid-tier", "Micro and nano"] },
        { title: "Fit", prompts: ["Audience alignment", "Brand safety", "Content style"] },
        { title: "Deliverables", prompts: ["Content format", "Usage rights", "Timeline and pay"] },
        { title: "Measurement", prompts: ["Reach and engagement", "Conversions", "Qualitative feedback"] },
      ]),
  },
  {
    id: "global-expansion-planning-board",
    name: "Global Expansion Planning Board",
    category: "Elite",
    description: "Expand to new markets: market choice, localization, and go-to-market.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Market Choice", prompts: ["Priority markets", "Criteria", "Resource requirements"] },
        { title: "Localization", prompts: ["Language and copy", "Creative and cultural", "Legal and compliance"] },
        { title: "Go-to-Market", prompts: ["Channels", "Partners", "Launch plan"] },
        { title: "Success", prompts: ["Market KPIs", "Review cadence", "Scale or pivot triggers"] },
      ]),
  },
];
