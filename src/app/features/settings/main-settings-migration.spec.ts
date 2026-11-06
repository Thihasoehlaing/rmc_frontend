import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { RolesComponent } from './roles/roles.component';
import { UsersComponent } from './users/users.component';
import { WorkspaceManagementComponent } from './workspace-management/workspace-management.component';
import { SystemAccessComponent } from './system-access/system-access.component';

const pagination = { current_page: 1, per_page: 10, total_items: 0, total_pages: 0 };
const empty = { data: { items: [], pagination } };

describe('Standardized Main Settings', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RolesComponent,
        UsersComponent,
        WorkspaceManagementComponent,
        SystemAccessComponent,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ tab: 'users' }) },
            queryParamMap: of(convertToParamMap({ tab: 'users' })),
          },
        },
        { provide: ToastService, useValue: { success: () => {} } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));
  const noNativeControls = (element: HTMLElement) => {
    expect(
      element.querySelector('select,input[type="date"],input[type="datetime-local"]'),
    ).toBeNull();
    expect(element.querySelector('app-settings-page-header')).not.toBeNull();
    expect(element.querySelector('app-search-toolbar')).not.toBeNull();
    expect(element.querySelector('app-settings-panel')).not.toBeNull();
  };

  it('preserves Roles status filtering through the standard search toolbar', () => {
    const fixture = TestBed.createComponent(RolesComponent);
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/settings/roles')).flush(empty);
    fixture.detectChanges();
    noNativeControls(fixture.nativeElement);
    fixture.componentInstance.selectedStatus.set('Inactive');
    fixture.nativeElement.querySelector('app-search-toolbar button[type="submit"]').click();
    const request = http.expectOne((req) => req.url.endsWith('/settings/roles'));
    expect(request.request.params.get('status')).toBe('Inactive');
    request.flush(empty);
    fixture.destroy();
  });

  it('preserves Users filters and restricted workspace role options', () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/settings/roles/options'))
      .flush({
        data: [
          { id: 1, role_code: 'SYSTEM_ADMIN', role_name: 'System Admin' },
          { id: 2, role_code: 'RMC_ADMIN', role_name: 'RMC Admin' },
          { id: 3, role_code: 'ACADEMIC', role_name: 'Academic' },
        ],
      });
    http.expectOne((req) => req.url.endsWith('/master-data/departments')).flush({ data: [] });
    http.expectOne((req) => req.url.endsWith('/settings/users')).flush(empty);
    fixture.detectChanges();
    noNativeControls(fixture.nativeElement);
    const options = fixture.componentInstance.workspaceRoleOptions({
      workspace_id: 1,
      code: 'HR_SERVICES',
      name: 'HR',
      is_active: true,
      role_id: null,
    });
    expect(options.map((o) => o.value)).toEqual([null, 3]);
    fixture.componentInstance.selectedAccountType.set('Staff');
    fixture.componentInstance.search();
    const request = http.expectOne((req) => req.url.endsWith('/settings/users'));
    expect(request.request.params.get('account_type')).toBe('Staff');
    request.flush(empty);
    fixture.destroy();
  });

  it('keeps Workspace filtering local and edits isolated from stored rows', () => {
    const fixture = TestBed.createComponent(WorkspaceManagementComponent);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/settings/workspaces'))
      .flush({
        data: [
          { id: 1, code: 'RMC', name: 'RMC', domain_url: null, is_active: true, display_order: 1 },
          { id: 2, code: 'HR', name: 'HR', domain_url: null, is_active: false, display_order: 2 },
        ],
      });
    fixture.detectChanges();
    noNativeControls(fixture.nativeElement);
    fixture.componentInstance.selectedStatus.set('Inactive');
    fixture.componentInstance.search();
    expect(fixture.componentInstance.filtered().map((row) => row.code)).toEqual(['HR']);
    const row = fixture.componentInstance.rows()[0];
    fixture.componentInstance.edit(row);
    fixture.componentInstance.editing()!.name = 'Changed';
    expect(row.name).toBe('RMC');
    fixture.destroy();
  });

  it('preserves System Access allow/deny filters and plain dropdown editors', () => {
    const fixture = TestBed.createComponent(SystemAccessComponent);
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/settings/system-access/users')).flush(empty);
    fixture.detectChanges();
    noNativeControls(fixture.nativeElement);
    fixture.componentInstance.userAccessType.set('DENY');
    fixture.componentInstance.loadUsers();
    const request = http.expectOne((req) => req.url.endsWith('/settings/system-access/users'));
    expect(request.request.params.get('access_type')).toBe('DENY');
    request.flush(empty);
    fixture.destroy();
  });
});
