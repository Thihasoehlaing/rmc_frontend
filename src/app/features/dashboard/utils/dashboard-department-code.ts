const SCHOOL_CODES_BY_NAME: Readonly<Record<string, string>> = {
  'school of accounting and finance': 'SAF',
  'school of business': 'SOB',
  'school of global and tourism': 'SGHT',
  'school of global hospitality and tourism': 'SGHT',
  'school of marketing and management': 'SOMM',
  'school of computing': 'SOC',
  'school of engineering': 'SOE',
  'school of technology': 'SOT',
  'school of media arts and design': 'SOMAD',
  'school of mathematics actuarial and quantitative studies': 'SOMAQS',
  'school of psychology': 'SOP',
  'school of architecture and built environment': 'SOA',
  'school of foundation': 'SOF',
  'school of foundation studies': 'SOF',
  'school of general studies': 'SOGS',
  'digital learning hub': 'DLH',
  'strategic research institute': 'SRI',
};

const CANONICAL_SCHOOL_CODES = new Set(Object.values(SCHOOL_CODES_BY_NAME));

const LEGACY_GENERATED_CODES: Readonly<Record<string, string>> = {
  SB: 'SOB',
  SGT: 'SGHT',
  SMM: 'SOMM',
  SC: 'SOC',
  SE: 'SOE',
  ST: 'SOT',
  SMAD: 'SOMAD',
  SMAQS: 'SOMAQS',
  SP: 'SOP',
  SABE: 'SOA',
  SF: 'SOF',
  SFS: 'SOF',
  SGS: 'SOGS',
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function dashboardDepartmentCode(value: string | null | undefined): string {
  const department = value?.trim();
  if (!department) return 'UNKNOWN';

  const canonicalCode = SCHOOL_CODES_BY_NAME[normalizeName(department)];
  if (canonicalCode) return canonicalCode;

  const suppliedCode = department.toUpperCase();
  if (CANONICAL_SCHOOL_CODES.has(suppliedCode)) return suppliedCode;
  if (LEGACY_GENERATED_CODES[suppliedCode]) return LEGACY_GENERATED_CODES[suppliedCode];
  if (/^[A-Z0-9_-]{2,12}$/.test(suppliedCode)) return suppliedCode;

  const initials = department
    .split(/\s+/)
    .filter((word) => !['and', 'of', 'the', '&'].includes(word.toLowerCase()))
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return initials || 'UNKNOWN';
}
