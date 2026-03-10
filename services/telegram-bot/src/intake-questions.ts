export interface IntakeQuestion {
  id: string
  phase: "intro" | "brand_identity" | "strategy" | "audience"
  question: string
  followUp?: string
  examples?: string[]
  validation?: "text" | "list" | "url" | "choice"
  choices?: string[]
  required: boolean
}

export const INTAKE_PHASES = {
  intro: "Getting to Know You",
  brand_identity: "Brand Identity Blueprint",
  strategy: "Content Strategy Development", 
  audience: "Target Audience Analysis"
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  // ==========================================
  // PHASE 1: INTRODUCTION
  // ==========================================
  {
    id: "welcome",
    phase: "intro",
    question: "Welcome to KORA! 🎯\n\nI'm your AI-powered strategy partner. I'll help you build a comprehensive Brand Identity Blueprint, Content Strategy, and Target Audience Analysis.\n\nThis conversation will take about 15-20 minutes. Your answers will help me create professional, actionable strategies tailored specifically to you.\n\nLet's start with the basics. What's your full name?",
    required: true,
    validation: "text"
  },
  {
    id: "business_name",
    phase: "intro", 
    question: "Great to meet you! What's the name of your brand or business?\n\n(If you're building a personal brand, just use your name or the name you want to be known by)",
    required: true,
    validation: "text"
  },
  {
    id: "business_type",
    phase: "intro",
    question: "What type of business or brand are you building?",
    choices: [
      "Personal Brand / Creator",
      "Agency / Consultancy", 
      "Startup / Tech Company",
      "E-commerce / Product Brand",
      "Service Business",
      "Non-profit / Cause",
      "Other"
    ],
    required: true,
    validation: "choice"
  },
  {
    id: "website",
    phase: "intro",
    question: "Do you have a website? If so, share the URL. (Type 'none' if you don't have one yet)",
    required: false,
    validation: "url"
  },
  {
    id: "social_handles",
    phase: "intro",
    question: "What are your primary social media handles?\n\nList them like this:\n• Instagram: @yourhandle\n• TikTok: @yourhandle\n• LinkedIn: yourname\n• Twitter/X: @yourhandle\n\n(Include whichever platforms you use)",
    required: true,
    validation: "text"
  },

  // ==========================================
  // PHASE 2: BRAND IDENTITY BLUEPRINT
  // ==========================================
  {
    id: "brand_story",
    phase: "brand_identity",
    question: "🎨 *Brand Identity Blueprint*\n\nLet's build your brand foundation.\n\nTell me your story. Why did you start this? What's the origin story behind your brand?\n\n(Don't hold back — the more detail, the better I can capture your authentic voice)",
    required: true,
    validation: "text"
  },
  {
    id: "mission",
    phase: "brand_identity",
    question: "What's your mission? In one or two sentences, what are you ultimately trying to achieve or change?",
    examples: [
      "To democratize PR knowledge for founders who can't afford agencies",
      "To help creators build sustainable businesses from their content",
      "To make financial literacy accessible to underserved communities"
    ],
    required: true,
    validation: "text"
  },
  {
    id: "vision",
    phase: "brand_identity",
    question: "What's your vision? Where do you see your brand in 3-5 years? Paint the picture of success.",
    required: true,
    validation: "text"
  },
  {
    id: "core_values",
    phase: "brand_identity",
    question: "What are your 3-5 core values? These should be non-negotiable principles that guide everything you do.\n\nList them out, and briefly explain why each matters to you.",
    examples: [
      "Authenticity — I never pretend to be something I'm not",
      "Accessibility — Knowledge should be free and available",
      "Excellence — If I'm going to do it, I do it right"
    ],
    required: true,
    validation: "text"
  },
  {
    id: "unique_value",
    phase: "brand_identity",
    question: "What makes you different? Why should someone follow you instead of the hundreds of others in your space?\n\nThink about:\n• Your unique background or experience\n• Your perspective or approach\n• Something only you can offer",
    required: true,
    validation: "text"
  },
  {
    id: "brand_personality",
    phase: "brand_identity",
    question: "If your brand was a person at a party, how would they act? Choose 3-5 personality traits:",
    choices: [
      "Bold & Confident",
      "Warm & Approachable", 
      "Witty & Clever",
      "Professional & Polished",
      "Edgy & Provocative",
      "Calm & Thoughtful",
      "Energetic & Enthusiastic",
      "Mysterious & Intriguing",
      "Rebellious & Disruptive",
      "Nurturing & Supportive"
    ],
    required: true,
    validation: "list"
  },
  {
    id: "brand_voice",
    phase: "brand_identity",
    question: "How do you want to sound in your content? Describe your ideal brand voice.\n\nFor example: 'Confident but not arrogant. I explain complex things simply. I'm the smart friend who tells it to you straight.'",
    required: true,
    validation: "text"
  },
  {
    id: "avoid_perception",
    phase: "brand_identity",
    question: "What do you NOT want to be perceived as? What associations or vibes do you want to avoid?",
    examples: [
      "I don't want to seem like a guru or know-it-all",
      "I don't want to come across as salesy or desperate",
      "I don't want to be seen as another generic business coach"
    ],
    required: true,
    validation: "text"
  },

  // ==========================================
  // PHASE 3: CONTENT STRATEGY
  // ==========================================
  {
    id: "content_intro",
    phase: "strategy",
    question: "📝 *Content Strategy Development*\n\nNow let's build your content engine.\n\nWhat topics can you talk about for hours without getting bored? These will become your content pillars.",
    required: true,
    validation: "text"
  },
  {
    id: "expertise_areas",
    phase: "strategy",
    question: "What are you genuinely an expert in? Be specific.\n\nThink about:\n• Professional experience\n• Skills you've developed\n• Knowledge others pay you for\n• Things people always ask your advice on",
    required: true,
    validation: "text"
  },
  {
    id: "content_pillars",
    phase: "strategy",
    question: "Based on what you've shared, I'm thinking about your content pillars. But I want to hear from you — what 3 main categories should your content fall into?\n\nFor example, a PR expert might have:\n1. PR Education (building authority)\n2. Founder Life (building connection)\n3. Culture & Brand Commentary (building thought leadership)",
    required: true,
    validation: "text"
  },
  {
    id: "content_formats",
    phase: "strategy",
    question: "What content formats are you comfortable with or excited to create?",
    choices: [
      "Short-form video (TikTok, Reels, Shorts)",
      "Long-form video (YouTube)",
      "Written posts (LinkedIn, Threads)",
      "Podcasting",
      "Live streaming",
      "Newsletters",
      "Photography / Visual content",
      "Educational courses"
    ],
    required: true,
    validation: "list"
  },
  {
    id: "posting_frequency",
    phase: "strategy",
    question: "Realistically, how often can you commit to posting content per week?\n\n(Be honest — consistency beats volume)",
    choices: [
      "1-2 times per week",
      "3-4 times per week", 
      "5-7 times per week (daily)",
      "More than once per day"
    ],
    required: true,
    validation: "choice"
  },
  {
    id: "primary_platform",
    phase: "strategy",
    question: "Which platform do you want to prioritize first? (You can expand later, but focus wins early)",
    choices: [
      "TikTok",
      "Instagram",
      "YouTube",
      "LinkedIn",
      "Twitter/X",
      "Threads",
      "Newsletter"
    ],
    required: true,
    validation: "choice"
  },
  {
    id: "content_goals",
    phase: "strategy",
    question: "What are your main goals for your content in the next 6 months?",
    choices: [
      "Build brand awareness / grow following",
      "Generate leads for my business",
      "Establish thought leadership",
      "Build community",
      "Drive sales / conversions",
      "Land speaking opportunities",
      "Attract partnerships or collaborations"
    ],
    required: true,
    validation: "list"
  },
  {
    id: "competitor_inspiration",
    phase: "strategy",
    question: "Who do you admire in your space? Name 2-3 creators or brands whose content or positioning inspires you.\n\n(They don't have to be competitors — just people whose approach you respect)",
    required: true,
    validation: "text"
  },

  // ==========================================
  // PHASE 4: TARGET AUDIENCE ANALYSIS
  // ==========================================
  {
    id: "audience_intro",
    phase: "audience",
    question: "👥 *Target Audience Analysis*\n\nLast phase! Let's define who you're actually trying to reach.\n\nDescribe your ideal follower or customer. Who are they? What do they do?",
    required: true,
    validation: "text"
  },
  {
    id: "audience_age",
    phase: "audience",
    question: "What age range is your primary audience?",
    choices: [
      "18-24 (Gen Z)",
      "25-34 (Young Millennials)",
      "35-44 (Older Millennials)",
      "45-54 (Gen X)",
      "55+ (Boomers)",
      "Mixed / All ages"
    ],
    required: true,
    validation: "choice"
  },
  {
    id: "audience_pain_points",
    phase: "audience",
    question: "What are your audience's biggest pain points or frustrations?\n\nThink about:\n• What keeps them up at night?\n• What problems are they trying to solve?\n• What do they complain about?",
    required: true,
    validation: "text"
  },
  {
    id: "audience_desires",
    phase: "audience",
    question: "What does your audience deeply desire? What transformation are they seeking?",
    examples: [
      "They want visibility but don't know how to get it",
      "They want to be seen as an expert in their field",
      "They want financial freedom through their creative work"
    ],
    required: true,
    validation: "text"
  },
  {
    id: "audience_objections",
    phase: "audience",
    question: "What objections or hesitations might your audience have about following you or buying from you?",
    examples: [
      "They might think they're not ready yet",
      "They might think it's too expensive",
      "They might not trust online advice"
    ],
    required: true,
    validation: "text"
  },
  {
    id: "audience_platforms",
    phase: "audience",
    question: "Where does your ideal audience spend their time online?",
    choices: [
      "TikTok",
      "Instagram",
      "YouTube",
      "LinkedIn",
      "Twitter/X",
      "Threads",
      "Reddit",
      "Facebook",
      "Podcasts",
      "Newsletters"
    ],
    required: true,
    validation: "list"
  },
  {
    id: "audience_segments",
    phase: "audience",
    question: "Can you identify 2-3 specific types of people within your audience?\n\nFor example:\n1. Aspiring creators who want to go full-time\n2. Small business owners who need marketing help\n3. Corporate professionals who want to build a side brand",
    required: true,
    validation: "text"
  },
  {
    id: "call_to_action",
    phase: "audience",
    question: "When someone discovers you, what do you ultimately want them to do?\n\nWhat's the main call-to-action?",
    choices: [
      "Follow me on social media",
      "Subscribe to my newsletter",
      "Book a call / consultation",
      "Buy my product or service",
      "Join my community",
      "Download a free resource",
      "Watch my content"
    ],
    required: true,
    validation: "choice"
  },
  {
    id: "additional_context",
    phase: "audience",
    question: "Is there anything else you'd like me to know? Any context, goals, or constraints I should consider when building your strategy?",
    required: false,
    validation: "text"
  },

  // ==========================================
  // CONTENT INTELLIGENCE PREFERENCES
  // (Used by KORA to find relevant sources)
  // ==========================================
  {
    id: "topics_to_track",
    phase: "audience",
    question: "🧠 *Intelligence Preferences*\n\nNow let's set up your personalized content feed.\n\nWhat industries, topics, or trends do you want to stay informed about?\n\nFor example:\n• PR and communications trends\n• Startup funding news\n• Social media algorithm updates\n• Marketing case studies",
    required: true,
    validation: "text"
  },
  {
    id: "content_consumption",
    phase: "audience",
    question: "What type of content do you prefer consuming to stay informed?",
    choices: [
      "News articles and blogs",
      "Podcasts",
      "YouTube videos",
      "Newsletters",
      "Twitter/X threads",
      "LinkedIn posts",
      "Reddit discussions",
      "Industry reports"
    ],
    required: true,
    validation: "list"
  },
  {
    id: "thought_leaders",
    phase: "audience",
    question: "Who are the thought leaders, publications, or competitors you follow?\n\nList specific names, handles, or publications you pay attention to.\n\nFor example:\n• @garyvee for hustle content\n• Morning Brew newsletter\n• Harvard Business Review\n• Specific competitors in your space",
    required: true,
    validation: "text"
  },
  {
    id: "content_to_create",
    phase: "audience",
    question: "What type of content do you want to CREATE based on what you learn?\n\nThis helps me find sources that inspire actionable content.",
    choices: [
      "Educational / How-to content",
      "Industry commentary and hot takes",
      "Trend analysis and predictions",
      "Behind-the-scenes / Personal stories",
      "Case studies and breakdowns",
      "Entertainment and relatable content",
      "Promotional / Sales content",
      "Thought leadership and opinions"
    ],
    required: true,
    validation: "list"
  },
  {
    id: "topics_to_avoid",
    phase: "audience",
    question: "Are there any topics or types of content you want to AVOID seeing?\n\nFor example:\n• Politics\n• Controversial opinions\n• Competitor drama\n• Specific industries\n\n(Type 'none' if nothing specific)",
    required: false,
    validation: "text"
  },
  {
    id: "completion",
    phase: "audience",
    question: "🎉 *Amazing work!*\n\nYou've completed the KORA Strategy Intake. I now have everything I need to build your:\n\n✅ Brand Identity Blueprint\n✅ Content Strategy Document\n✅ Target Audience Analysis\n✅ Personalized Intelligence Feed\n\nI'll process your responses and have your personalized strategy documents ready within the next few minutes.\n\nOnce complete, I'll start sending you content recommendations. Just reply \"Approve\" to add them to your intelligence feed!\n\nThank you for trusting KORA with your brand! 🚀",
    required: false,
    validation: "text"
  }
]

export function getQuestionsByPhase(phase: string): IntakeQuestion[] {
  return INTAKE_QUESTIONS.filter(q => q.phase === phase)
}

export function getNextQuestion(currentId: string | null): IntakeQuestion | null {
  if (!currentId) return INTAKE_QUESTIONS[0]
  
  const currentIndex = INTAKE_QUESTIONS.findIndex(q => q.id === currentId)
  if (currentIndex === -1 || currentIndex >= INTAKE_QUESTIONS.length - 1) return null
  
  return INTAKE_QUESTIONS[currentIndex + 1]
}

export function getCurrentPhaseProgress(questionId: string): { current: number; total: number; phase: string } {
  const question = INTAKE_QUESTIONS.find(q => q.id === questionId)
  if (!question) return { current: 0, total: INTAKE_QUESTIONS.length, phase: "intro" }
  
  const phaseQuestions = INTAKE_QUESTIONS.filter(q => q.phase === question.phase)
  const phaseIndex = phaseQuestions.findIndex(q => q.id === questionId)
  
  return {
    current: phaseIndex + 1,
    total: phaseQuestions.length,
    phase: INTAKE_PHASES[question.phase]
  }
}
