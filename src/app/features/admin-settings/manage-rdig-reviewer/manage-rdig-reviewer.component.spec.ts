import '@angular/compiler';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { environment } from '../../../../environments/environment';
import { ManageRdigReviewerComponent } from './manage-rdig-reviewer.component';

describe('ManageRdigReviewerComponent', () => {
  let component: ManageRdigReviewerComponent;
  let fixture: ComponentFixture<ManageRdigReviewerComponent>;
  let http: HttpTestingController;

  const apiUrl = environment.apiUrl.replace(/\/$/, '');
  const staffUrl = `${apiUrl}/rmc/settings/academic-staff`;
  const departmentsUrl = `${apiUrl}/rmc/master-data/departments`;
  const reviewersUrl = `${apiUrl}/rmc/admin-settings/rdig-reviewers`;

  const staffResponse = {
    success: true,
    message: 'ok',
    data: {
      items: [
        {
          id: 101,
          staff: {
            id: 1,
            username: 'jdoe',
            fullname: 'Jane Doe',
            email: 'jdoe@uni.edu',
            department: 'Computer Science',
            job_title: 'Lecturer',
            is_active: true,
          },
          is_active: true,
        },
        {
          id: 102,
          staff: {
            id: 2,
            username: 'asmith',
            fullname: 'Alan Smith',
            email: 'asmith@uni.edu',
            department: 'Engineering',
            job_title: 'Professor',
            is_active: true,
          },
          is_active: true,
        },
      ],
      pagination: {
        current_page: 1,
        per_page: 10,
        total_items: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    },
  };

  const reviewersResponse = {
    success: true,
    message: 'ok',
    data: {
      items: [
        {
          id: 55,
          is_active: true,
          staff_username: 'asmith',
          staff_fullname: 'Alan Smith',
          staff_email: 'asmith@uni.edu',
          job_title: 'Professor',
          department: 'Engineering',
        },
      ],
      pagination: {
        current_page: 1,
        per_page: 100,
        total_items: 1,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    },
  };

  function flushInitialRequests(): void {
    http.expectOne((req) => req.url === departmentsUrl).flush({ success: true, message: 'ok', data: [] });
    http.expectOne((req) => req.url === reviewersUrl).flush(reviewersResponse);
    http.expectOne((req) => req.url === staffUrl).flush(staffResponse);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ManageRdigReviewerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(ManageRdigReviewerComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    flushInitialRequests();
  });

  afterEach(() => {
    http.verify();
  });

  it('loads staff and cross-references the reviewer pool by username', () => {
    const rows = component.staffRows();
    expect(rows.length).toBe(2);

    const janeRow = rows.find((r) => r.username === 'jdoe')!;
    const alanRow = rows.find((r) => r.username === 'asmith')!;

    expect(janeRow.reviewerId).toBeNull();
    expect(alanRow.reviewerId).toBe(55);
  });

  it('has no maximum-reviewer cap', () => {
    expect((component as unknown as { maximumAssignedReviewers?: number }).maximumAssignedReviewers).toBeUndefined();
  });

  it('adds a staff member to the reviewer pool', () => {
    const janeRow = component.staffRows().find((r) => r.username === 'jdoe')!;

    component.addReviewer(janeRow);

    const req = http.expectOne(reviewersUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ academic_staff_id: 101, is_active: true });
    req.flush({
      success: true,
      message: 'created',
      data: { id: 99, is_active: true, staff_username: 'jdoe', staff_fullname: 'Jane Doe', staff_email: 'jdoe@uni.edu', job_title: 'Lecturer', department: 'Computer Science' },
    });

    const updated = component.staffRows().find((r) => r.username === 'jdoe')!;
    expect(updated.reviewerId).toBe(99);
  });

  it('removes a staff member from the reviewer pool', () => {
    const alanRow = component.staffRows().find((r) => r.username === 'asmith')!;

    component.removeReviewer(alanRow);

    const req = http.expectOne(`${reviewersUrl}/55`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'deleted', data: {} });

    const updated = component.staffRows().find((r) => r.username === 'asmith')!;
    expect(updated.reviewerId).toBeNull();
  });

  it('paginates using the academic-staff endpoint with the requested page size', () => {
    component.onPageChange(2);

    const req = http.expectOne((r) => r.url === staffUrl);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('per_page')).toBe('10');
    req.flush(staffResponse);
  });

  it('"In Pool" queries the reviewer endpoint directly, filtered across all entries', () => {
    component.setPoolStatusFilter('in-pool');

    const req = http.expectOne((r) => r.url === reviewersUrl);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('per_page')).toBe('10');
    req.flush(reviewersResponse);

    const rows = component.staffRows();
    expect(rows.length).toBe(1);
    expect(rows[0].username).toBe('asmith');
    expect(rows[0].reviewerId).toBe(55);
    expect(component.totalItems()).toBe(1);
  });

  it('"Not in Pool" fetches every staff page and excludes reviewers, across all entries', () => {
    component.setPoolStatusFilter('not-in-pool');

    const req = http.expectOne((r) => r.url === staffUrl);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('per_page')).toBe('100');
    req.flush(staffResponse);

    const rows = component.staffRows();
    expect(rows.length).toBe(1);
    expect(rows[0].username).toBe('jdoe');
    expect(component.totalItems()).toBe(1);
  });
});
