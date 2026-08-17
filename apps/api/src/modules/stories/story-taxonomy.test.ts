import { describe, expect, it } from 'vitest';
import {
  enforceMinimumAgeRating,
  minimumAgeRatingForTags,
  storyTaxonomyResponse,
} from './story-taxonomy.js';

describe('story age ratings', () => {
  it('publishes the five supported age classifications', () => {
    const ratings = storyTaxonomyResponse().ageRatings;
    expect(ratings.map((rating) => rating.value)).toEqual([
      'all',
      '11',
      '13',
      '16',
      '18',
    ]);
    expect(ratings.every((rating) => rating.description.length > 0)).toBe(true);
  });

  it('raises Gore to a minimum of +16', () => {
    expect(minimumAgeRatingForTags(['Gore'])).toBe('16');
    expect(enforceMinimumAgeRating('all', ['Gore'])).toBe('16');
  });

  it('does not raise Romance by itself', () => {
    expect(enforceMinimumAgeRating('all', ['Romance lento'])).toBe('all');
  });

  it('raises sexual content to +18 and preserves stricter author choices', () => {
    expect(enforceMinimumAgeRating('11', ['Contenido sexual'])).toBe('18');
    expect(enforceMinimumAgeRating('18', ['Violencia'])).toBe('18');
  });
});
