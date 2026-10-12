import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { RdigDetailsComponent } from './rdig-details.component';
import { RdigApiService, RdigFormData } from '../../services/rdig-api.service';
import { WorkflowRequestsService, RequestSummaryDto } from '../../../../core/services/workflow-requests.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AttachmentDownloadService } from '../../../../core/services/attachment-download.service';
import { ActionLoadingService } from '../../../../core/services/action-loading.service';
import { RdigReviewerService } from '../../../admin-settings/manage-rdig-reviewer/rdig-reviewer.service';

describe('RDIG application batch presentation', () => {
  let component: RdigDetailsComponent;
  const viewer = signal<{ username: string; groups: string[]; role: { code: string } } | null>(null);
  const batch: NonNullable<RequestSummaryDto['batch']> = {
    id: 3, batch_name: 'RDIG Batch 3 of 2026', status: 'COMPLETED',
    start_date: '2026-09-01T00:00:00Z', end_date: '2026-09-30T09:00:00Z',
    stage_windows: [{
      stage_name: 'HOS First Review',
      stage_start_date: '2026-09-10T01:30:00Z',
      stage_end_date: '2026-09-12T09:45:00Z',
    }],
  };

  function setRequest(status: string, requestBatch: RequestSummaryDto['batch'] = batch): void {
    component.data.set({ request: { status_code: status, batch: requestBatch } } as RdigFormData);
  }

  beforeEach(() => {
    viewer.set(null);
    TestBed.configureTestingModule({ providers: [
      ...[ActivatedRoute, Router, Location, RdigApiService, WorkflowRequestsService,
        AttachmentDownloadService, ActionLoadingService, RdigReviewerService]
        .map(token => ({ provide: token, useValue: {} })),
      { provide: AuthService, useValue: { currentUser: viewer } },
    ] });
    component = TestBed.runInInjectionContext(() => new RdigDetailsComponent());
  });

  it('labels the associated historical batch and ends the stage display for approved applications', () => {
    setRequest('approved');
    expect(component.applicationBatchStatus()).toBe('Historical batch');
    expect(component.hasCurrentWorkflowStage()).toBe(false);
    expect(component.currentStageWindowTitle()).toContain('review complete');
    expect(component.currentStageWindowState()).toBeNull();
  });

  it('uses stage dates rather than the overall batch dates and shows Malaysia time', () => {
    setRequest('pending_hos', { ...batch, status: 'active' });
    expect(component.applicationBatchStatus()).toBe('Active batch');
    expect(component.currentStageWindowTitle()).toBe('HOS First Review');
    expect(component.currentStageWindowOpensLabel()).toBe('10-09-2026 09:30 AM');
    expect(component.currentStageWindowClosesLabel()).toBe('12-09-2026 05:45 PM');
  });

  it('keeps missing stage dates explicit without substituting batch dates', () => {
    setRequest('pending_vc');
    expect(component.currentStageWindowOpensLabel()).toBe('Not scheduled');
    expect(component.currentStageWindowClosesLabel()).toBe('Not scheduled');
  });

  it('uses a specific resubmission window ahead of the legacy shared window', () => {
    setRequest('pending_applicant_resubmission_rmc', { ...batch, stage_windows: [
      { stage_name: 'Applicant Resubmission', stage_start_date: '2026-09-10T01:00:00Z', stage_end_date: null },
      { stage_name: 'Applicant Resubmission — RMC Requested', stage_start_date: '2026-09-11T02:00:00Z', stage_end_date: null },
    ] });
    expect(component.currentStageWindowOpensLabel()).toBe('11-09-2026 10:00 AM');
  });

  it('handles rejected applications and unknown or unassigned batches without claiming they are active', () => {
    setRequest('rejected_hos', { ...batch, status: null });
    expect(component.hasCurrentWorkflowStage()).toBe(false);
    expect(component.currentStageWindowTitle()).toContain('review ended');
    expect(component.applicationBatchStatus()).toBe('Batch status unavailable');
    setRequest('draft', null);
    expect(component.request()?.batch).toBeNull();
    expect(component.fmtBatchDateTime(null)).toBe('Not scheduled');
  });

  it('distinguishes upcoming, open and closed at the exact stage boundaries', () => {
    setRequest('pending_hos', { ...batch, status: 'active' });
    const start = Date.parse('2026-09-10T01:30:00Z');
    const end = Date.parse('2026-09-12T09:45:00Z');
    component.scheduleNow.set(start - 1);
    expect(component.currentStageWindowState()).toBe('upcoming');
    component.scheduleNow.set(start);
    expect(component.currentStageWindowState()).toBe('open');
    component.scheduleNow.set(end);
    expect(component.currentStageWindowState()).toBe('open');
    component.scheduleNow.set(end + 1);
    expect(component.currentStageWindowState()).toBe('closed');
  });

  it('shows whose turn it is using viewer role and API permissions', () => {
    setRequest('pending_hos', { ...batch, status: 'active' });
    component.scheduleNow.set(Date.parse('2026-09-11T00:00:00Z'));
    viewer.set({ username: 'admin', groups: ['RMC'], role: { code: 'RMC_ADMIN' } });
    expect(component.currentStageViewerMessage()).toContain('Waiting for HOS First Review');
    viewer.set({ username: 'hos', groups: ['HOS'], role: { code: 'HOS' } });
    expect(component.currentStageViewerMessage()).toContain('no action is currently available');
    component.canAct.set(true);
    expect(component.currentStageViewerMessage()).toContain('It is your turn');
    component.scheduleNow.set(Date.parse('2026-09-13T00:00:00Z'));
    expect(component.currentStageViewerMessage()).toContain('window has ended');
  });

  it('does not call an incomplete or invalid schedule open, even if API permits action', () => {
    setRequest('pending_vc', { ...batch, status: 'active' });
    component.canAct.set(true);
    expect(component.currentStageWindowState()).toBe('unscheduled');
    expect(component.currentStageViewerMessage()).toContain('must be configured');
    setRequest('pending_hos', { ...batch, status: 'active', stage_windows: [{
      stage_name: 'HOS First Review', stage_start_date: '2026-09-12T00:00:00Z', stage_end_date: '2026-09-10T00:00:00Z',
    }] });
    expect(component.currentStageWindowState()).toBe('unscheduled');
  });

  it('treats historical batches as closed even when stage dates include today', () => {
    setRequest('pending_hos');
    component.scheduleNow.set(Date.parse('2026-09-11T00:00:00Z'));
    expect(component.currentStageWindowState()).toBe('closed');
  });
});
