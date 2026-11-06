import { VoteNumbersComponent } from './vote-numbers/vote-numbers.component';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { MonitoringComponent } from './monitoring/monitoring.component';
import { FormsComponent } from './forms/forms.component';
import { ToastService } from '../../core/services/toast.service';

const empty = {
  success: true,
  data: {
    items: [],
    pagination: { current_page: 1, per_page: 10, total_items: 0, total_pages: 1 },
  },
};
describe('Remaining Main Settings migration', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonitoringComponent, FormsComponent, VoteNumbersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ tab: 'mail-logs' }) },
            queryParamMap: of(convertToParamMap({ tab: 'mail-logs' })),
          },
        },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));
  it('preserves Monitoring date/status API filters with custom date controls', () => {
    const fixture = TestBed.createComponent(MonitoringComponent);
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/settings/mail-logs')).flush(empty);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.dateFrom.set('2026-11-01');
    component.dateTo.set('2026-11-06');
    component.selectedStatus.set('FAILED');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('app-search-toolbar button[type="submit"]').click();
    const req = http.expectOne((req) => req.url.endsWith('/settings/mail-logs'));
    expect(req.request.params.get('date_from')).toBe('2026-11-01');
    expect(req.request.params.get('date_to')).toBe('2026-11-06');
    expect(req.request.params.get('mail_status')).toBe('FAILED');
    req.flush(empty);
    expect(fixture.nativeElement.querySelector('select,input[type="date"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-date-picker').length).toBe(2);
    for (const field of fixture.nativeElement.querySelectorAll('app-field')) {
      const label = field.querySelector('label');
      const input = field.querySelector('input');
      if (label && input) expect(label.htmlFor).toBe(input.id);
    }
    component.activeTab.set('staff-sync-logs');
    expect(component.monitoringStatusOptions().map((option) => option.value)).toEqual([
      '',
      'SUCCESS',
      'FAILED',
      'RUNNING',
    ]);
    fixture.destroy();
  });
  it('preserves numeric workspace IDs and explicit All selection for Forms', () => {
    const fixture = TestBed.createComponent(FormsComponent);
    fixture.detectChanges();
    http
      .match(() => true)
      .forEach((req) =>
        req.flush(
          req.request.url.endsWith('/workspaces')
            ? {
                success: true,
                data: {
                  items: [{ id: 7, code: 'RMC', name: 'Research', is_active: true, forms: [] }],
                  can_manage_settings: true,
                },
              }
            : empty,
        ),
      );
    fixture.detectChanges();
    expect(
      fixture.componentInstance.workspacePickerOptions(true).map((option) => option.value),
    ).toEqual([null, 7]);
    expect(fixture.nativeElement.querySelector('select,input[type="date"]')).toBeNull();
    fixture.destroy();
  });
  it('preserves Vote Number form sharing and closes its compact editor after saving', () => {
    const fixture = TestBed.createComponent(VoteNumbersComponent);
    fixture.detectChanges();
    http
      .match(() => true)
      .forEach((req) =>
        req.flush(req.request.url.endsWith('/vote-numbers') ? empty : { success: true, data: [] }),
      );
    fixture.componentInstance.openEditDialog({
      id: 5,
      code: 'V-001',
      description: 'Research',
      is_active: true,
      form_codes: ['JOUR', 'CONF'],
      formNames: ['Journal', 'Conference'],
      statusLabel: 'Active',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-add-option-modal')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-dialog')).not.toBeNull();
    fixture.componentInstance.editor.appliesTo = ['JOUR'];
    fixture.componentInstance.saveModal(fixture.componentInstance.editor);
    const request = http.expectOne(
      (req) => req.method === 'PUT' && req.url.endsWith('/vote-numbers/5'),
    );
    expect(request.request.body.form_codes).toEqual(['JOUR']);
    request.flush({ success: true, data: {} });
    expect(fixture.componentInstance.showEditor()).toBe(false);
    http.expectOne((req) => req.url.endsWith('/vote-numbers')).flush(empty);
    fixture.destroy();
  });
});
