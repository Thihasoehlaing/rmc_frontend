import { NavPermission } from '../interfaces/permission.interface';

export const disabledFeaturePermission = {
  denyAll: true,
} satisfies NavPermission;

export const adminPermission = {
  anyOf: ['Admin'],
} satisfies NavPermission;

export const systemOrRmcAdminPermission = {
  anyOf: ['Admin', 'RMC'],
} satisfies NavPermission;

export const academicHosChancelloryPermission = {
  anyCondition: [
    {
      anyOf: ['full_time', 'contract'],
      allOf: ['academic'],
    },
    {
      anyOf: ['HOS'],
    },
    {
      anyOf: ['Chancellory'],
    },
  ],
} satisfies NavPermission;

export const fundingApplicationPermission = academicHosChancelloryPermission;

export const fundingDetailPermission = {
  anyCondition: [
    ...academicHosChancelloryPermission.anyCondition,
    {
      anyOf: ['VC', 'HR', 'CEO', 'Finance', 'Admin', 'RMC'],
    },
  ],
} satisfies NavPermission;

export const conferencePermission = fundingDetailPermission;

export const journalPermission = fundingDetailPermission;

export const submissionsInboxHistoryPermission = {
  anyCondition: [
    ...academicHosChancelloryPermission.anyCondition,
    {
      anyOf: ['VC', 'HR', 'CEO', 'Finance', 'Admin', 'RMC'],
    },
  ],
} satisfies NavPermission;

export const submissionsDraftPendingPermission = {
  anyCondition: [
    ...academicHosChancelloryPermission.anyCondition,
    {
      anyOf: ['Admin', 'RMC'],
    },
  ],
} satisfies NavPermission;

export const submissionsAdminOnlyPermission = systemOrRmcAdminPermission;

export const rdigPermission = {
  anyOf: ['full_time', 'contract'],
  allOf: ['academic'],
  excludeGroups: ['Reviewer', 'HOS'],
} satisfies NavPermission;

export const ragraPermission = disabledFeaturePermission;

export const travelAuthorizationPermission = disabledFeaturePermission;

export const partnershipPermission = disabledFeaturePermission;

export const adminSettingsPermission = adminPermission;

export const systemSettingsPermission = {
  allOf: ['SystemAdmin'],
} satisfies NavPermission;

export const externalProjectDataEntryPermission = {
  anyOf: ['RMC'],
} satisfies NavPermission;

export const adminHistoryPermission = systemOrRmcAdminPermission;

export const adminOnlySettingsChildPermission = adminPermission;
