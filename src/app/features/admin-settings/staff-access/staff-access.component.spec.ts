import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { StaffAccessComponent } from './staff-access.component';

describe('StaffAccessComponent', () => {
  let component: StaffAccessComponent;
  let fixture: ComponentFixture<StaffAccessComponent>;
  let http: HttpTestingController;

  const apiUrl = environment.apiUrl.replace(/\/$/, '');
  const staffAccessUrl = `${apiUrl}/rmc/admin-settings/staff-access`;
  const departmentsUrl = `${apiUrl}/rmc/master-data/departments`;

  const listResponse = {
    success: true,
    message: 'Staff access retrieved successfully',
    data: {
      items: [
        {
          id: 1,
          staff_username: 'jdoe',
          staff_name: 'Jane Doe',
          staff_email: 'jdoe@uni.edu',
          department: 'Computer Science',
          job_title: 'Lecturer',
          status: 'ACTIVE',
          has_access: true,
          blocked_date: null,
          blocked_by: null,
          reason: null,
        },
        {
          id: 2,
          staff_username: 'asmith',
          staff_name: 'Alan Smith',
          staff_email: 'asmith@uni.edu',
          department: 'Engineering',
          job_title: 'Professor',
          status: 'BLOCKED',
          has_access: false,
          blocked_date: '2026-06-01T10:00:00',
          blocked_by: 'admin',
          reason: 'Account audit',
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

  function flushInitialRequests(): void {
    http.expectOne((req) => req.url === departmentsUrl).flush({ success: true, message: 'ok', data: [] });
    http
      .expectOne((req) => req.url === staffAccessUrl && req.params.get('status') === 'blocked')
      .flush({
        success: true,
        message: 'ok',
        data: { items: [], pagination: { ...listResponse.data.pagination, total_items: 1 } },
      });
    http
      .expectOne((req) => req.url === staffAccessUrl && req.params.get('status') === 'blocked' && req.params.get('per_page') === '10')
      .flush(listResponse);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffAccessComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffAccessComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushInitialRequests();
  });

  afterEach(() => {
    http.verify();
  });

  it('loads staff access records with real pagination params', () => {
    const rows = component.staffRecords();
    expect(rows.length).toBe(2);
    expect(rows[0].status).toBe('active');
    expect(rows[1].status).toBe('blocked');
    expect(component.totalItems()).toBe(2);
    expect(component.blockedCount()).toBe(1);
  });

  it('blocks an active staff member', () => {
    const active = component.staffRecords().find((r) => r.status === 'active')!;

    component.toggleAccess(active);

    const blockReq = http.expectOne(`${staffAccessUrl}/1/block`);
    expect(blockReq.request.method).toBe('POST');
    blockReq.flush({
      success: true,
      message: 'Staff blocked successfully',
      data: { ...listResponse.data.items[0], status: 'BLOCKED', has_access: false },
    });

    http
      .expectOne((req) => req.url === staffAccessUrl && req.params.get('status') === 'blocked' && req.params.get('per_page') === '10')
      .flush(listResponse);
    http
      .expectOne((req) => req.url === staffAccessUrl && req.params.get('status') === 'blocked')
      .flush({
        success: true,
        message: 'ok',
        data: { items: [], pagination: { ...listResponse.data.pagination, total_items: 2 } },
      });
  });

  it('unblocks a blocked staff member', () => {
    const blocked = component.staffRecords().find((r) => r.status === 'blocked')!;

    component.toggleAccess(blocked);

    const unblockReq = http.expectOne(`${staffAccessUrl}/2/unblock`);
    expect(unblockReq.request.method).toBe('POST');
    unblockReq.flush({
      success: true,
      message: 'Staff unblocked successfully',
      data: { ...listResponse.data.items[1], status: 'ACTIVE', has_access: true },
    });

    http
      .expectOne((req) => req.url === staffAccessUrl && req.params.get('status') === 'blocked' && req.params.get('per_page') === '10')
      .flush(listResponse);
    http
      .expectOne((req) => req.url === staffAccessUrl && req.params.get('status') === 'blocked')
      .flush({
        success: true,
        message: 'ok',
        data: { items: [], pagination: { ...listResponse.data.pagination, total_items: 0 } },
      });
  });

  it('paginates using the requested page size', () => {
    component.onPageChange(2);

    const req = http.expectOne((r) => r.url === staffAccessUrl);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('per_page')).toBe('10');
    req.flush(listResponse);
  });
});
