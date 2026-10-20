export type HomeFaqItem = {
  question: string;
  answer: string;
};

export const HOME_FAQS: HomeFaqItem[] = [
  {
    question: 'What are natural casings?',
    answer:
      'Natural casings are cleaned animal intestines used for sausages and specialty meats — mainly sheep casings, hog casings, and beef casings. Buyers care about calibre, salt grade, packing, and origin. CasingConnect software is built for companies in that trade, not for phone cases or other “casing” products.',
  },
  {
    question: 'What is CasingConnect?',
    answer:
      'CasingConnect is B2B natural casing business software for processors, traders, and exporters. It runs private company books — buying, store and factory stock, production, sales, expenses, and party ledgers — plus an optional public company website and marketplace presence.',
  },
  {
    question: 'Is each company’s data private and secure?',
    answer:
      'Yes. Every firm has its own private books. Purchases, stock, sales, and ledgers stay inside your company account and are not mixed with another firm’s data. Access is limited to signed-in users you invite.',
  },
  {
    question: 'Does CasingConnect work outside Pakistan and with other currencies?',
    answer:
      'Yes. Companies in Pakistan can start quickly, and firms abroad can request a tailored setup for local currency, workflow, and practice. Contact us through the tailored setup form if you need customisation.',
  },
  {
    question: 'Can my company get a public website for buyers?',
    answer:
      'Yes. When Activate website is enabled for your account, your team can publish a branded public site with cover, logo, gallery, colours, and product content so buyers can find and contact you.',
  },
  {
    question: 'What is the CasingConnect Marketplace?',
    answer:
      'The Marketplace is where natural casing companies list trade offers and browse a directory of buyers and sellers. It helps the casing trade discover partners while your private books stay separate.',
  },
  {
    question: 'How do we get started?',
    answer:
      'Register your business to open private books, or request a tailored setup if you need currency or workflow changes first. You can also take the product tour to see buying, stock, production, sales, and ledgers end to end.',
  },
];

export function homeFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HOME_FAQS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
