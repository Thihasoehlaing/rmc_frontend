/**
 * UserGroup — every distinct attribute or membership a user can hold.
 * A single user may belong to multiple groups simultaneously.
 *
 * Group descriptions:
 *   full_time            — Full-time university employees
 *   contract             — Contract / part-time employees
 *   academic             — Academic staff (lecturers, researchers, professors)
 *   HOS                  — Head of School (department head / line manager)
 *   VC                   — Vice Chancellor level approval
 *   group_ra_gra_hos_pass — RA/GRA applicants who have received explicit HOS approval
 *   blocked_hos_rdig     — HOS user on the RDIG block list; cannot submit new RDIG applications
 *   RMC                  — RMC staff — system managers and reviewers
 *   Admin                — System administrators (full system access)
 *   Reviewer             — Application reviewers (may overlap with RMC)
 *   Reviewer1            — Assigned Reviewer 1 for an application
 *   Reviewer2            — Assigned Reviewer 2 for an application
 *   RDIG_Chair           — RDIG Committee Chair
 *   CEO                  — Chief Executive Officer level approval
 */
export type UserGroup =
  | 'full_time'
  | 'contract'
  | 'academic'
  | 'HOS'
  | 'VC'
  | 'group_ra_gra_hos_pass'
  | 'blocked_hos_rdig'
  | 'RMC'
  | 'Admin'
  | 'SystemAdmin'
  | 'Reviewer'
  | 'Reviewer1'
  | 'Reviewer2'
  | 'RDIG_Chair'
  | 'CEO';

export interface UserRole {
  id: number;
  code: string | null;
  name: string | null;
}

export interface User {
  department: string;
  distinguishedName?: string;
  id: string;
  name: string;
  email: string;
  /** Login identifier (used alongside email for authentication) */
  username: string;
  /**
   * DEMO ONLY — plaintext password for mock authentication.
   * A real implementation must NEVER store passwords in the client.
   */
  password?: string;
  role?: UserRole;
  /** All groups this user belongs to — drives every permission decision. */
  groups: UserGroup[];
}
