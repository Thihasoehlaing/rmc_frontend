import '@angular/compiler';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { ManageRdigReviewerComponent } from './manage-rdig-reviewer.component';

describe('ManageRdigReviewerComponent', () => {
  let component: ManageRdigReviewerComponent;
  let fixture: ComponentFixture<ManageRdigReviewerComponent>;
  let http: HttpTestingController;

  const apiUrl = environment.apiUrl.replace(/\/$/, '');
  const academicOptionsUrl = `${apiUrl}/rmc/academic-staff`;
  const departmentsUrl = `${apiUrl}/rmc/master-data/departments`;
  const reviewersUrl = `${apiUrl}/rmc/admin-settings/rdig-reviewers`;

  const academicOptionsResponse = {
    success: true,
    message: 'ok',
    data: [
      {
        id: 101,
        username: 'jdoe',
        fullname: 'Jane Doe',
        email: 'jdoe@uni.edu',
        department: 'Computer Science',
      },
      {
        id: 102,
        username: 'asmith',
        fullname: 'Alan Smith',
        email: 'asmith@uni.edu',
        department: 'Engineering',
      },
    ],
  };

  const departmentsResponse = {
    success: true,
    message: 'ok',
    data: [{ id: 7, department_name: 'Engineering', department_type: 'School', is_active: true }],
  };

  const reviewersResponse = {
    success: true,
    message: 'ok',
    data: {
      items: [
        {
          id: 55,
          academic_staff_id: 102,
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
        per_page: 10,
        total_items: 1,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    },
  };

  function flushInitialRequests(): void {
    http.expectOne((req) => req.url === academicOptionsUrl).flush(academicOptionsResponse);
    http.expectOne((req) => req.url === departmentsUrl).flush(departmentsResponse);
    http.expectOne((req) => req.url === reviewersUrl).flush(reviewersResponse);
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

  it('loads academic options and department options before loading reviewers', () => {
    expect(component.staffOptions().map((option) => option.value)).toEqual([101, 102]);
    expect(component.departmentOptions()).toEqual([{ value: 7, label: 'Engineering' }]);
    expect(component.reviewers().length).toBe(1);
    expect(component.reviewers()[0].staff_username).toBe('asmith');
  });

  it('filters reviewers by search, department, and status', () => {
    component.searchQuery.set('alan');
    component.departmentFilter.set(7);
    component.onStatusChange('inactive');

    const req = http.expectOne((r) => r.url === reviewersUrl);
    expect(req.request.params.get('search')).toBe('alan');
    expect(req.request.params.get('department_id')).toBe('7');
    expect(req.request.params.get('status')).toBe('inactive');
    req.flush(reviewersResponse);
  });

  it('adds selected academic staff as reviewers with the chosen status', () => {
    component.openAddModal();
    component.selectedStaffControl.setValue([101, 102]);
    component.modalActiveControl.setValue(false);
    component.saveReviewers();

    const requests = http.match(reviewersUrl);
    expect(requests.length).toBe(2);

    const [first, second] = requests;
    expect(first.request.method).toBe('POST');
    expect(first.request.body).toEqual({ academic_staff_id: 101, is_active: false });
    first.flush({
      success: true,
      message: 'created',
      data: { id: 99, academic_staff_id: 101, is_active: false },
    });

    expect(second.request.method).toBe('POST');
    expect(second.request.body).toEqual({ academic_staff_id: 102, is_active: false });
    second.flush({
      success: true,
      message: 'created',
      data: { id: 100, academic_staff_id: 102, is_active: false },
    });

    http.expectOne((r) => r.url === reviewersUrl).flush(reviewersResponse);
  });

  it('updates reviewer active status', () => {
    component.toggleStatus(component.reviewers()[0]);

    const req = http.expectOne(`${reviewersUrl}/55`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ is_active: false });
    req.flush({
      success: true,
      message: 'updated',
      data: { ...reviewersResponse.data.items[0], is_active: false },
    });

    http.expectOne((r) => r.url === reviewersUrl).flush(reviewersResponse);
  });

  it('removes a reviewer after confirmation', () => {
    component.rowToRemove.set(component.reviewers()[0]);
    component.confirmRemove();

    const req = http.expectOne(`${reviewersUrl}/55`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'deleted', data: {} });

    http.expectOne((r) => r.url === reviewersUrl).flush(reviewersResponse);
  });
});
