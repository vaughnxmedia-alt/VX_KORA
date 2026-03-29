import type { InspiredTemplate } from "./types";
import { layoutColumnsWithNotes } from "./helpers";

export const creativeTemplates: InspiredTemplate[] = [
  {
    id: "brand-moodboard",
    name: "Brand Moodboard",
    category: "Creative",
    description: "Visual direction: palette, imagery, typography, and references.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Color Palette", prompts: ["Primary colors", "Secondary and accents", "Usage rules"] },
        { title: "Imagery", prompts: ["Style and mood", "Do and don't", "Reference examples"] },
        { title: "Typography", prompts: ["Headlines", "Body and UI", "Hierarchy"] },
        { title: "Voice", prompts: ["Tone descriptors", "Sample copy", "Guardrails"] },
      ]),
  },
  {
    id: "music-video-treatment-board",
    name: "Music Video Treatment Board",
    category: "Creative",
    description: "Treatment structure: concept, story, visual style, and production notes.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Concept", prompts: ["Core idea", "Mood and genre", "Key visual hook"] },
        { title: "Story", prompts: ["Narrative arc", "Key moments", "Lyric sync points"] },
        { title: "Visual Style", prompts: ["Look and feel", "Locations", "Lighting and color"] },
        { title: "Production", prompts: ["Cast and crew needs", "Schedule and budget", "Deliverables"] },
      ]),
  },
  {
    id: "film-documentary-development-board",
    name: "Film or Documentary Development Board",
    category: "Creative",
    description: "Development framework: premise, characters, structure, and research.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Premise", prompts: ["Logline", "Themes", "Why now"] },
        { title: "Characters / Subjects", prompts: ["Main subjects", "Supporting", "Conflict and stakes"] },
        { title: "Structure", prompts: ["Act 1", "Act 2", "Act 3 / resolution"] },
        { title: "Research", prompts: ["Key sources", "Archival and B-roll", "Legal and clearance"] },
      ]),
  },
  {
    id: "photo-shoot-creative-brief",
    name: "Photo Shoot Creative Brief",
    category: "Creative",
    description: "Brief for a photo shoot: concept, talent, styling, and shot list.",
    generateBoard: (boardId) =>
      layoutColumnsWithNotes(boardId, [
        { title: "Concept", prompts: ["Creative concept", "Mood and references", "Usage and formats"] },
        { title: "Talent", prompts: ["Model/cast direction", "Wardrobe", "HMU"] },
        { title: "Styling", prompts: ["Props and set", "Color palette", "Do and don't"] },
        { title: "Shot List", prompts: ["Must-have shots", "Variations", "Detail and cutaway"] },
      ]),
  },
];
