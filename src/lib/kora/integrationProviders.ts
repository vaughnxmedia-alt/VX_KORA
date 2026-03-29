/**
 * Social platforms available for API key connections and strategy/campaign targeting.
 */

export interface SocialIntegrationProvider {
  id: string;
  label: string;
  description: string;
}

export const SOCIAL_INTEGRATION_PROVIDERS: SocialIntegrationProvider[] = [
  {
    id: "instagram",
    label: "Instagram",
    description: "Meta Graph API access for Instagram Business or Creator accounts.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "LinkedIn Marketing / Share API credentials for your organization.",
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    description: "X API v2 bearer or OAuth app credentials, depending on your use case.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "TikTok for Developers API keys for content and analytics.",
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Meta Graph API for Pages and scheduled posts.",
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "YouTube Data API key or OAuth client for channel operations.",
  },
];
