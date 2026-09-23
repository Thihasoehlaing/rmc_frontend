import { describe, expect, it } from 'vitest';

import { dashboardDepartmentCode } from './dashboard-department-code';

describe('dashboardDepartmentCode', () => {
  it.each([
    ['School of Accounting and Finance', 'SAF'],
    ['School of Business', 'SOB'],
    ['School of Global and Tourism', 'SGHT'],
    ['School of Global Hospitality and Tourism', 'SGHT'],
    ['School of Marketing and Management', 'SOMM'],
    ['School of Computing', 'SOC'],
    ['School of Engineering', 'SOE'],
    ['School of Technology', 'SOT'],
    ['School of Media, Arts and Design', 'SOMAD'],
    ['School of Mathematics, Actuarial and Quantitative Studies', 'SOMAQS'],
    ['School of Psychology', 'SOP'],
    ['School of Architecture and Built Environment', 'SOA'],
    ['School of Foundation', 'SOF'],
    ['School of Foundation Studies', 'SOF'],
    ['School of General Studies', 'SOGS'],
    ['Digital Learning Hub', 'DLH'],
    ['Strategic Research Institute', 'SRI'],
  ])('maps %s to %s', (department, expectedCode) => {
    expect(dashboardDepartmentCode(department)).toBe(expectedCode);
  });

  it('normalizes case, spacing, canonical codes, and legacy generated codes', () => {
    expect(dashboardDepartmentCode('  SCHOOL   OF   COMPUTING ')).toBe('SOC');
    expect(dashboardDepartmentCode('somad')).toBe('SOMAD');
    expect(dashboardDepartmentCode('SC')).toBe('SOC');
    expect(dashboardDepartmentCode(null)).toBe('UNKNOWN');
  });
});
