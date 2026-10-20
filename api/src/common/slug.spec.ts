import { slugify } from './slug';

describe('slugify', () => {
  it('turns a business name into a web address piece', () => {
    expect(slugify('Al-Noor Casings')).toBe('al-noor-casings');
  });

  it('drops punctuation and keeps a fallback', () => {
    expect(slugify('Sheep & Co.')).toBe('sheep-co');
    expect(slugify('   ')).toBe('business');
  });
});
