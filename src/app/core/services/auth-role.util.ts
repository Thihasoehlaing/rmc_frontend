import { UserGroup } from '../interfaces/user.interface';

export function mapRoleToGroups(
  roleCode: string | null | undefined,
  academicEligible = false,
): UserGroup[] {
  if (!roleCode) return [];

  const roleGroups: Record<string, UserGroup[]> = {
    SYSTEM_ADMIN: ['Admin', 'SystemAdmin'],
    RMC_ADMIN: ['RMC', 'Admin'],
    RMC_STAFF: ['RMC'],
    RMC: ['RMC'],
    REVIEWER: ['Reviewer'],
    APPLICANT: ['Applicant'],
    ACADEMIC: ['Applicant'], // Compatibility with cached pre-rename sessions.
    LECTURER: ['Applicant'],
    HEAD_OF_SCHOOL: ['HOS'],
    HEAD_OF_DEPARTMENT: ['HOS'],
    HOS: ['HOS'],
    HOD: ['HOS'],
    VICE_CHANCELLOR: ['VC'],
    VC: ['VC'],
    HUMAN_RESOURCE: ['HR'],
    CEO: ['CEO'],
    CFO: ['CFO'],
    FINANCE: ['Finance'],
    RDIG_CHAIR: ['RDIG_Chair'],
  };

  const code = roleCode.trim().toUpperCase();
  const groups = [...(roleGroups[code] ?? [])];
  // Preserve existing RMC role boundaries; academic status comes from the API.
  if (
    academicEligible &&
    ['APPLICANT', 'ACADEMIC', 'LECTURER', 'HEAD_OF_SCHOOL', 'HEAD_OF_DEPARTMENT'].includes(code)
  ) {
    groups.push('full_time', 'academic');
  }
  return groups;
}
