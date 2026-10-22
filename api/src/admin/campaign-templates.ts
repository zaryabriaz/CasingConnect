export const CAMPAIGN_TEMPLATES = [
  'INTERNATIONAL',
  'PAKISTAN',
  'MARKETPLACE',
  'TAILORED',
  'COMBINED',
] as const;
export type CampaignTemplateId = (typeof CAMPAIGN_TEMPLATES)[number];
