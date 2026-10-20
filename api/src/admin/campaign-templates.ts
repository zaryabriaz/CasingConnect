export const CAMPAIGN_TEMPLATES = ['MARKETPLACE', 'TAILORED', 'COMBINED'] as const;
export type CampaignTemplateId = (typeof CAMPAIGN_TEMPLATES)[number];
