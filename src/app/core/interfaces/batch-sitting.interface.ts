/**
 * batch-sitting.interface.ts
 * Future integration: Replace HttpClient calls in BatchSittingService with real API endpoints.
 */

export type WorkflowStageKey =
  | 'applicant'
  | 'hos_first_review'
  | 'applicant_resubmission_hos'
  | 'applicant_resubmission_rmc'
  | 'applicant_resubmission_reviewers'
  | 'hos_review_again'
  | 'rmc'
  | 'reviewers'
  | 'rmc_again'
  | 'rdig_chair'
  | 'vc'
  | 'cfo';

export interface WorkflowStageWindow {
  startDate: string | null;
  endDate: string | null;
}

export type BatchStatus = 'active' | 'planned' | 'completed';

export interface BatchSitting {
  id: number;
  batchName: string;
  status: BatchStatus;
  startDate: string;
  endDate: string;
  stages: Record<WorkflowStageKey, WorkflowStageWindow>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** Set when RMC manually ends the batch or auto-complete triggers. */
  endedAt?: string;
  /** IDs of all applications formally submitted under this batch. Populated client-side on first submission. */
  applicationIds?: number[];
}

export interface WorkflowStageMeta {
  key: WorkflowStageKey;
  label: string;
  description: string;
  rdigStatuses: string[];
}

export const WORKFLOW_STAGE_META: WorkflowStageMeta[] = [
  { key: 'applicant',              label: 'Applicant',               description: 'Applicants submit their RDIG applications within this window.',   rdigStatuses: ['draft'] },
  { key: 'hos_first_review',       label: 'HOS First Review',       description: 'Head of School reviews the application for the first time.',     rdigStatuses: ['pending_hos'] },
  { key: 'applicant_resubmission_hos', label: 'Applicant Resubmission — HOS Requested', description: 'Applicant revises and resubmits after HOS requests changes.', rdigStatuses: ['pending_applicant_resubmission_hos'] },
  { key: 'hos_review_again',       label: 'HOS Review (Again)',      description: 'Head of School re-reviews the revised application.',              rdigStatuses: ['pending_hos_review'] },
  { key: 'rmc',                    label: 'RMC',                     description: 'Research Management Centre initial review.',                      rdigStatuses: ['pending_rmc'] },
  { key: 'applicant_resubmission_rmc', label: 'Applicant Resubmission — RMC Requested', description: 'Applicant revises and resubmits after RMC requests changes.', rdigStatuses: ['pending_applicant_resubmission_rmc'] },
  { key: 'reviewers',              label: 'Reviewers',               description: 'Assigned reviewers evaluate the application.',                    rdigStatuses: ['pending_reviewers'] },
  { key: 'applicant_resubmission_reviewers', label: 'Applicant Resubmission — Reviewers Requested', description: 'Applicant revises and resubmits after reviewers request changes.', rdigStatuses: ['pending_applicant_resubmission_reviewers'] },
  { key: 'rmc_again',             label: 'RMC (Again)',              description: 'RMC conducts final review after reviewers.',                      rdigStatuses: ['pending_rmc_review'] },
  { key: 'rdig_chair',             label: 'RDIG Chair',              description: 'RDIG Chair reviews and approves.',                               rdigStatuses: ['pending_rdig_chair'] },
  { key: 'vc',                     label: 'Vice Chancellor (VC)',     description: 'VC approves the research application.',                          rdigStatuses: ['pending_vc'] },
  { key: 'cfo',                    label: 'CFO',                     description: 'CFO gives final approval.',                                      rdigStatuses: ['pending_cfo'] },
];
