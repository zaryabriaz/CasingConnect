import type { Metadata } from 'next';
import { HomeExperience } from '@/components/home-motion';
import { JsonLd } from '@/components/json-ld';
import { homeFaqJsonLd } from '@/lib/home-faq';
import { pageMetadata } from '@/lib/seo';
import './home.css';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'B2B Natural Casing Business Software',
    description:
      'CasingConnect is B2B natural casing business software for sheep and hog casing companies. Run buying, stock, production, sales, expenses, and party ledgers — plus a public company website and marketplace.',
    path: '/',
    keywords: [
      'natural casings',
      'natural casing',
      'B2B natural casing business software',
      'natural casing software',
      'sheep casings',
      'hog casings',
      'casing trade software',
      'Sialkot casings',
      'casing stock management',
      'party ledger',
      'casing marketplace',
      'CasingConnect',
    ],
  }),
  title: {
    absolute: 'CasingConnect | B2B Natural Casing Business Software',
  },
};

export default function HomePage() {
  return (
    <>
      <link rel="preload" as="image" href="/home-hero.webp?v=7" type="image/webp" />
      <JsonLd data={homeFaqJsonLd()} />
      <HomeExperience />
    </>
  );
}
