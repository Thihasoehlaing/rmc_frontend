import '@angular/compiler';
import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  SDG_KEYWORD_FORMAT_MESSAGE,
  sdgKeywordValidator
} from './sdg-keyword.validator';

describe('sdgKeywordValidator', () => {
  it.each([
    'Climate action-SDG 13',
    'Climate - SDG 1',
    'Climate-SDG 1',
    'Climate- SDG 1',
    'Climate -SDG 1',
    'Climate-SDG1',
    '  Climate action - SDG 13  ',
    'Quality education-SDG 4',
    'Industry, innovation and infrastructure-SDG 9'
  ])('accepts a keyword with a valid SDG suffix: %s', (value) => {
    expect(sdgKeywordValidator(new FormControl(value))).toBeNull();
  });

  it.each([
    'Climate action',
    '-SDG 1',
    '   - SDG 1',
    'Climate SDG 1',
    'Climate-1',
    'Climate-SDG',
    'Climate action-SDG 0',
    'Climate action-SDG 18',
    'Climate action-SDG thirteen'
  ])('rejects an invalid SDG keyword: %s', (value) => {
    expect(sdgKeywordValidator(new FormControl(value))).toEqual({
      pattern: expect.objectContaining({
        actualValue: value,
        message: SDG_KEYWORD_FORMAT_MESSAGE
      })
    });
  });

  it('leaves empty-value validation to Validators.required', () => {
    expect(sdgKeywordValidator(new FormControl(''))).toBeNull();
  });
});
