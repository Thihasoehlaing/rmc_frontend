import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const SDG_KEYWORD_EXAMPLE = 'e.g. Climate action-SDG 13';
export const SDG_KEYWORD_NOTE =
  'Enter keyword with the related SDG number.\n(eg: xxxx keyword in abstract xxxxx-SDG X)';
export const SDG_KEYWORD_FORMAT_MESSAGE =
  'Enter a keyword, followed by a hyphen, SDG, and a number from 1 to 17.';

const SDG_KEYWORD_PATTERN =
  /^\s*\S(?:.*\S)?\s*-\s*SDG\s*(?:[1-9]|1[0-7])\s*$/;

export const sdgKeywordValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string' && SDG_KEYWORD_PATTERN.test(value)) {
    return null;
  }

  return {
    pattern: {
      requiredPattern: SDG_KEYWORD_PATTERN.source,
      actualValue: value,
      message: SDG_KEYWORD_FORMAT_MESSAGE
    }
  };
};
