export const CAMPAIGN_TEMPLATES = [
  'WELCOME',
  'PUBLIC_SITE',
  'CHAT',
  'INTERNATIONAL',
  'PAKISTAN',
  'MARKETPLACE',
  'TAILORED',
  'COMBINED',
] as const;
export type CampaignTemplateId = (typeof CAMPAIGN_TEMPLATES)[number];
