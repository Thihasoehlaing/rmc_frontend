import { UserGroup } from './user.interface';

/**
 * A single ABAC condition evaluated as:
 *   1. excludeGroups — if the user has ANY excluded group → DENY
 *   2. anyOf         — user must belong to at least one
 *   3. allOf         — user must belong to all
 */
export interface PermissionCondition {
  denyAll?: boolean;
  anyOf?: UserGroup[];
  allOf?: UserGroup[];
  excludeGroups?: UserGroup[];
}

/**
 * NavPermission defines ABAC-style access rules for a navigation item,
 * folder, group, or protected route.
 *
 * Two forms — pick one per rule:
 *
 *  Flat form (all conditions AND-joined):
 *   1. excludeGroups — if the user has ANY excluded group → DENY immediately
 *   2. anyOf         — user must belong to AT LEAST ONE group
 *   3. allOf         — user must belong to ALL listed groups
 *
 *  anyCondition form (conditions OR-joined):
 *   Access is granted if the user satisfies ANY ONE of the listed PermissionConditions.
 *   Use this when the rule has OR branches between different group combinations.
 *
 *   No rules set → ALLOW (visible to all authenticated users)
 */
export interface NavPermission extends PermissionCondition {
  /**
   * OR-join: access is granted if the user satisfies ANY ONE condition set.
   * When present, the flat anyOf / allOf / excludeGroups fields are ignored.
   */
  anyCondition?: PermissionCondition[];
}
