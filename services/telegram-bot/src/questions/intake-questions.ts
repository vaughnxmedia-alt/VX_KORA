import type { IntakeQuestion, IntakePhase } from "../types/intake"

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "business_name",
    phase: "intro",
    question: "What is your business or brand name?",
    required: true,
    minLength: 2,
  },
  {
    id: "business_type",
    phase: "intro",
    question: "What type of business or service do you offer?",
    followUp: "For example: consulting, coaching, agency, product-based, etc.",
    required: true,
    minLength: 5,
  },
  {
    id: "website",
    phase: "intro",
    question: "What is your website URL?",
    followUp: "If you don't have one yet, type 'none'.",
    validation: "url",
    required: false,
  },
  {
    id: "social_handles",
    phase: "intro",
    question: "What are your social media handles?",
    followUp: "List your Instagram, Twitter, LinkedIn, TikTok, YouTube, etc.",
    examples: ["@mybrand on Instagram, @mybrand on Twitter", "instagram.com/mybrand, linkedin.com/in/myname"],
    required: false,
  },
  {
    id: "mission",
    phase: "brand_identity",
    question: "What is your mission? Why does your business exist?",
    followUp: "Think about the change you want to create in the world or for your customers.",
    examples: [
      "To help small businesses grow their online presence",
      "To make quality education accessible to everyone",
    ],
    required: true,
    minLength: 20,
    clarificationPrompt: "Your mission should explain WHY your business exists. Can you be more specific about the change you want to create?",
  },
  {
    id: "vision",
    phase: "brand_identity",
    question: "What is your vision? Where do you see your brand in 5-10 years?",
    examples: [
      "To be the go-to resource for startup marketing",
      "To have helped 10,000 people achieve financial freedom",
    ],
    required: false,
  },
  {
    id: "core_values",
    phase: "brand_identity",
    question: "What are your core values? What principles guide your business decisions?",
    followUp: "List 3-5 values that you would never compromise on.",
    examples: ["Integrity, Innovation, Community, Excellence", "Authenticity, Empowerment, Transparency"],
    required: true,
    clarificationPrompt: "Core values should be specific principles. Can you list 3-5 values that truly guide your business?",
  },
  {
    id: "brand_personality",
    phase: "brand_identity",
    question: "If your brand were a person, how would you describe their personality?",
    followUp: "Use 3-5 adjectives or phrases.",
    examples: [
      "Bold, innovative, approachable",
      "Warm, nurturing, professional, reliable",
    ],
    required: true,
  },
  {
    id: "brand_voice",
    phase: "brand_identity",
    question: "How would you describe your brand's voice and communication style?",
    examples: [
      "Professional but friendly, uses industry terms but explains them",
      "Casual and fun, speaks like a friend giving advice",
    ],
    required: true,
  },
  {
    id: "unique_value",
    phase: "brand_identity",
    question: "What makes you different from your competitors? What's your unique value proposition?",
    followUp: "Think about what you offer that others don't, or what you do better.",
    required: true,
    minLength: 30,
    clarificationPrompt: "Be specific about what makes YOU unique. Generic answers like 'quality' or 'service' don't help differentiate you.",
  },
  {
    id: "avoid_perception",
    phase: "brand_identity",
    question: "What do you NOT want people to think about your brand?",
    followUp: "What misconceptions or perceptions do you want to avoid?",
    examples: [
      "Cheap, inexperienced, generic",
      "Out of touch, too corporate, unapproachable",
    ],
    required: false,
  },
  {
    id: "brand_story",
    phase: "brand_identity",
    question: "What's the origin story of your brand? How did you get started?",
    followUp: "People connect with stories. Share what inspired you to start this journey.",
    required: false,
  },
  {
    id: "expertise_areas",
    phase: "strategy",
    question: "What are your main areas of expertise?",
    followUp: "What topics could you speak about for hours without preparation?",
    required: true,
  },
  {
    id: "content_pillars",
    phase: "strategy",
    question: "What are the main content pillars or themes you want to be known for?",
    followUp: "These are the core topics your content will consistently cover.",
    examples: [
      "Marketing tips, industry insights, behind-the-scenes",
      "Recipes, nutrition education, meal prep guides",
    ],
    required: true,
    clarificationPrompt: "Content pillars are the main themes for your content. What 3-4 topics do you want to consistently create content about?",
  },
  {
    id: "content_formats",
    phase: "strategy",
    question: "What content formats do you enjoy creating or want to create?",
    examples: [
      "Short videos, carousels, stories",
      "Blog posts, podcasts, YouTube videos, threads",
    ],
    required: true,
  },
  {
    id: "posting_frequency",
    phase: "strategy",
    question: "How often can you realistically create and post content?",
    choices: ["Daily", "3-5 times per week", "Weekly", "A few times per month"],
    required: true,
  },
  {
    id: "primary_platform",
    phase: "strategy",
    question: "What is your primary social media platform or where do you want to focus?",
    choices: ["Instagram", "Twitter/X", "LinkedIn", "TikTok", "YouTube", "Multiple"],
    required: true,
  },
  {
    id: "content_goals",
    phase: "strategy",
    question: "What are your main content goals?",
    examples: [
      "Build brand awareness, generate leads, educate audience",
      "Sell products, build community, establish thought leadership",
    ],
    required: true,
  },
  {
    id: "competitor_inspiration",
    phase: "strategy",
    question: "Who are 2-3 competitors or brands whose content you admire?",
    followUp: "What do you like about their content?",
    required: false,
  },
  {
    id: "audience_age",
    phase: "audience",
    question: "What is the general age range of your target audience?",
    examples: ["25-35", "Millennials and Gen Z", "35-55 professionals"],
    required: true,
  },
  {
    id: "audience_pain_points",
    phase: "audience",
    question: "What problems or pain points does your audience face that you solve?",
    followUp: "Think about their frustrations, challenges, and what keeps them up at night.",
    required: true,
    minLength: 15,
    clarificationPrompt: "Be specific about the problems. What exact frustrations do your ideal customers experience?",
  },
  {
    id: "audience_desires",
    phase: "audience",
    question: "What does your audience want to achieve or become?",
    followUp: "Think about their goals, aspirations, and dreams.",
    required: true,
  },
  {
    id: "audience_objections",
    phase: "audience",
    question: "What objections or hesitations might your audience have before working with you?",
    examples: [
      "Too expensive, don't have time, tried before and failed",
      "Skeptical of results, prefer to DIY",
    ],
    required: false,
  },
  {
    id: "audience_platforms",
    phase: "audience",
    question: "Where does your audience hang out online?",
    followUp: "Which platforms do they use most? What communities are they part of?",
    required: true,
  },
  {
    id: "audience_segments",
    phase: "audience",
    question: "Can you identify 2-3 distinct segments or types within your audience?",
    examples: [
      "Beginners vs advanced, B2B vs B2C, budget-conscious vs premium",
      "DIYers, busy professionals, small business owners",
    ],
    required: false,
  },
  {
    id: "call_to_action",
    phase: "audience",
    question: "What is the main action you want your audience to take?",
    examples: [
      "Book a call, purchase a product, join email list",
      "Sign up for course, download free guide, follow for more",
    ],
    required: true,
  },
  {
    id: "topics_to_track",
    phase: "content_intelligence",
    question: "What topics or trends do you want to stay on top of?",
    followUp: "What should KORA monitor to keep your content relevant?",
    required: false,
  },
  {
    id: "content_consumption",
    phase: "content_intelligence",
    question: "What type of content do you consume to stay informed in your field?",
    examples: [
      "Podcasts, newsletters, Twitter threads",
      "YouTube videos, LinkedIn posts, industry blogs",
    ],
    required: false,
  },
  {
    id: "thought_leaders",
    phase: "content_intelligence",
    question: "Who are the thought leaders or creators you follow in your space?",
    followUp: "List names or handles of people whose insights you value.",
    required: false,
  },
  {
    id: "content_to_create",
    phase: "content_intelligence",
    question: "What type of content resonates most with your audience based on your experience?",
    examples: [
      "Educational posts get more engagement",
      "Personal stories and behind-the-scenes do best",
    ],
    required: false,
  },
  {
    id: "topics_to_avoid",
    phase: "content_intelligence",
    question: "Are there any topics you want to avoid in your content?",
    followUp: "This could be controversial subjects, competitor mentions, or personal boundaries.",
    required: false,
  },
  {
    id: "additional_context",
    phase: "content_intelligence",
    question: "Is there anything else you'd like me to know about your brand or audience?",
    followUp: "Any additional context that might help create a better strategy.",
    required: false,
  },
]

export function getQuestionById(id: string): IntakeQuestion | undefined {
  return INTAKE_QUESTIONS.find(q => q.id === id)
}

export function getQuestionsByPhase(phase: IntakePhase): IntakeQuestion[] {
  return INTAKE_QUESTIONS.filter(q => q.phase === phase)
}

export function getRequiredQuestions(): IntakeQuestion[] {
  return INTAKE_QUESTIONS.filter(q => q.required)
}

export function getNextQuestion(currentIndex: number): IntakeQuestion | null {
  if (currentIndex < INTAKE_QUESTIONS.length - 1) {
    return INTAKE_QUESTIONS[currentIndex + 1]
  }
  return null
}

export function getCurrentQuestionId(index: number): string | null {
  if (index >= 0 && index < INTAKE_QUESTIONS.length) {
    return INTAKE_QUESTIONS[index].id
  }
  return null
}

export function getTotalQuestions(): number {
  return INTAKE_QUESTIONS.length
}

export function getQuestionIndex(questionId: string): number {
  return INTAKE_QUESTIONS.findIndex(q => q.id === questionId)
}
