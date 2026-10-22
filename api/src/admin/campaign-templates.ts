export const CAMPAIGN_TEMPLATES = ['SOFTWARE', 'MARKETPLACE', 'TAILORED', 'COMBINED'] as const;
export type CampaignTemplateId = (typeof CAMPAIGN_TEMPLATES)[number];
