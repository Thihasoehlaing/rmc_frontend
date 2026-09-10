import '@angular/compiler';

import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import {
  RDIG_KEYWORD_MAX_LENGTH,
  parseRdigKeywords,
  rdigKeywordInputValidator,
  rdigKeywordsValidator,
  serializeRdigKeywords,
} from './rdig-keywords.util';

describe('RDIG keyword utilities', () => {
  it('round-trips five trimmed keywords through the existing API string format', () => {
    const serialized = serializeRdigKeywords([' AI ', 'Health', 'Energy', 'Climate', 'Education']);

    expect(serialized).toBe('AI, Health, Energy, Climate, Education');
    expect(parseRdigKeywords(serialized)).toEqual([
      'AI',
      'Health',
      'Energy',
      'Climate',
      'Education',
    ]);
  });

  it('accepts between one and five keywords with at most 100 characters each', () => {
    expect(rdigKeywordsValidator(new FormControl('One'))).toBeNull();
    expect(rdigKeywordsValidator(new FormControl('One, Two, Three, Four, Five'))).toBeNull();
    expect(rdigKeywordsValidator(new FormControl('One, Two, Three, Four, Five, Six'))).not.toBeNull();
    expect(
      rdigKeywordsValidator(
        new FormControl(`One, Two, Three, Four, ${'x'.repeat(RDIG_KEYWORD_MAX_LENGTH + 1)}`),
      ),
    ).not.toBeNull();
  });

  it('rejects commas inside an individual keyword box', () => {
    expect(rdigKeywordInputValidator(new FormControl('Artificial intelligence'))).toBeNull();
    expect(rdigKeywordInputValidator(new FormControl('AI, machine learning'))).not.toBeNull();
  });
});
