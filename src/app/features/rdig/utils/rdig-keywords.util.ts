import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const RDIG_KEYWORD_COUNT = 5;
export const RDIG_KEYWORD_MAX_LENGTH = 100;

export const RDIG_KEYWORDS_VALIDATION_MESSAGE =
  'Enter between 1 and 5 keywords, with a maximum of 100 characters for each keyword.';
export const RDIG_KEYWORD_INPUT_VALIDATION_MESSAGE = 'Enter one keyword per box without commas.';

export function parseRdigKeywords(value: unknown): string[] {
  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function serializeRdigKeywords(keywords: readonly string[]): string {
  return keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .join(', ');
}

export const rdigKeywordsValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;

  const keywords = parseRdigKeywords(value);
  const isValid =
    keywords.length >= 1 &&
    keywords.length <= RDIG_KEYWORD_COUNT &&
    keywords.every((keyword) => keyword.length <= RDIG_KEYWORD_MAX_LENGTH);

  return isValid
    ? null
    : {
        pattern: {
          message: RDIG_KEYWORDS_VALIDATION_MESSAGE,
        },
      };
};

export const rdigKeywordInputValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;

  return typeof value === 'string' && !value.includes(',')
    ? null
    : {
        pattern: {
          message: RDIG_KEYWORD_INPUT_VALIDATION_MESSAGE,
        },
      };
};
