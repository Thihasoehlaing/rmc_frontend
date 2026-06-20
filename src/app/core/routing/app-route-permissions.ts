import { NavPermission } from '../interfaces/permission.interface';

export const rdigPermission = {
  anyOf: ['full_time', 'contract'],
  allOf: ['academic'],
  excludeGroups: ['Reviewer', 'HOS'],
} satisfies NavPermission;

export const conferencePermission = {
  anyCondition: [
    {
      anyOf: ['full_time', 'contract'],
      allOf: ['academic'],
      excludeGroups: ['Reviewer', 'HOS'],
    },
    {
      anyOf: ['Admin'],
    },
  ],
} satisfies NavPermission;

export const journalPermission = {
  anyCondition: [
    { anyOf: ['full_time', 'contract'], allOf: ['academic'] },
    { anyOf: ['HOS'] },
    { anyOf: ['VC'] },
    { anyOf: ['Admin'] },
  ],
} satisfies NavPermission;

export const ragraPermission = {
  anyOf: ['full_time', 'contract'],
  allOf: ['academic'],
} satisfies NavPermission;

export const travelAuthorizationPermission = {
  excludeGroups: ['Admin'],
} satisfies NavPermission;

export const partnershipPermission = {
  anyCondition: [
    {
      anyOf: ['full_time', 'contract'],
      allOf: ['academic'],
    },
    {
      anyOf: ['Admin'],
    },
  ],
} satisfies NavPermission;

export const adminSettingsPermission = {
  anyOf: ['Admin'],
} satisfies NavPermission;

export const systemSettingsPermission = {
  allOf: ['SystemAdmin'],
} satisfies NavPermission;
