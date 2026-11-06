import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ApplicantRulesComponent } from './applicant-rules/applicant-rules.component';
import { RequestStatusesComponent } from './request-statuses/request-statuses.component';
import { DropdownComponent } from '../../shared/components/dropdown/dropdown.component';
import { SearchableDropdownComponent } from '../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { ToastService } from '../../core/services/toast.service';

const forms = [
  {
    id: 7,
    form_code: 'JOUR',
    form_name: 'Journal Publication',
    workspace_code: 'RMC',
    workspace_id: 1,
    workspace_name: 'RMC',
    is_active: true,
  },
];
const departments = [
  { id: 1, department_name: 'Computing', department_type: 'PRIMARY', is_active: true },
  { id: 2, department_name: 'Engineering', department_type: 'PRIMARY', is_active: true },
];
const staff = [
  {
    id: 1,
    username: 'aisha',
    fullname: 'Aisha Rahman',
    email: 'aisha@example.test',
    staff_type: 'ACADEMIC',
    department: 'Computing',
  },
];
const empty = {
  success: true,
  data: {
    items: [],
    pagination: { current_page: 1, per_page: 10, total_items: 0, total_pages: 1 },
  },
};

describe('Standardized RMC Settings', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicantRulesComponent, RequestStatusesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));
  function flushApplicantOptions() {
    http.expectOne((req) => req.url.endsWith('/rmc-settings/forms')).flush({ data: forms });
    http
      .expectOne((req) => req.url.endsWith('/master-data/departments'))
      .flush({ data: departments });
    http.expectOne((req) => req.url.endsWith('/master-data/staff')).flush({ data: staff });
    http.expectOne((req) => req.url.endsWith('/rmc-settings/applicant-rules')).flush(empty);
  }
  it('preserves Applicant Rules filters and the nullable All forms option', () => {
    const fixture = TestBed.createComponent(ApplicantRulesComponent);
    fixture.detectChanges();
    flushApplicantOptions();
    fixture.detectChanges();
    const picker = fixture.debugElement
      .queryAll(By.directive(DropdownComponent))
      .find((el) => el.componentInstance.label === 'Form')!.componentInstance as DropdownComponent;
    picker.choose('1');
    fixture.componentInstance.selectedRuleType.set('STAFF');
    fixture.componentInstance.selectedStatus.set('Inactive');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('app-search-toolbar button[type="submit"]').click();
    const request = http.expectOne((req) => req.url.endsWith('/applicant-rules'));
    expect(request.request.params.get('form_code')).toBe('JOUR');
    expect(request.request.params.get('rule_type')).toBe('STAFF');
    expect(request.request.params.get('status')).toBe('Inactive');
    request.flush(empty);
    picker.choose('0');
    expect(fixture.componentInstance.selectedFormCode()).toBeNull();
    expect(fixture.nativeElement.querySelector('select,input[type="date"]')).toBeNull();
    fixture.destroy();
  });
  it('keeps staff searching local to fetched options and restores selected staff', async () => {
    const fixture = TestBed.createComponent(ApplicantRulesComponent);
    fixture.detectChanges();
    flushApplicantOptions();
    fixture.componentInstance.openCreateDialog();
    fixture.componentInstance.onRuleTypeChange('STAFF');
    fixture.componentInstance.ruleValuesControl.setValue(['aisha']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const staffPicker = fixture.debugElement
      .queryAll(By.directive(SearchableDropdownComponent))
      .find((el) => el.componentInstance.label === 'Staff')!;
    expect(staffPicker.nativeElement.textContent).toContain('Aisha Rahman');
    staffPicker.nativeElement.querySelector('[role="combobox"]').click();
    fixture.detectChanges();
    const input = staffPicker.nativeElement.querySelector('.sd-search-input');
    input.value = 'Aisha';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(staffPicker.nativeElement.textContent).toContain('Aisha Rahman');
    http.expectNone((req) => req.url.endsWith('/master-data/staff'));
    fixture.destroy();
  });
  it('creates one rule per department through the normal multi-select', () => {
    const fixture = TestBed.createComponent(ApplicantRulesComponent);
    fixture.detectChanges();
    flushApplicantOptions();
    const component = fixture.componentInstance;
    component.openCreateDialog();
    component.formCode.set('JOUR');
    component.onRuleTypeChange('DEPARTMENT');
    fixture.detectChanges();
    const picker = fixture.debugElement
      .queryAll(By.directive(DropdownComponent))
      .find((el) => el.componentInstance.label === 'Departments')!
      .componentInstance as DropdownComponent;
    picker.choose(['0', '1']);
    component.saveRule();
    const requests = http.match(
      (req) => req.method === 'POST' && req.url.endsWith('/applicant-rules'),
    );
    expect(requests.map((req) => req.request.body.rule_value)).toEqual([
      'Computing',
      'Engineering',
    ]);
    requests.forEach((req) => req.flush({ success: true, data: {} }));
    expect(component.dialogMode()).toBeNull();
    http.expectOne((req) => req.url.endsWith('/applicant-rules')).flush(empty);
    fixture.destroy();
  });
  it('preserves request-status form IDs, optional actor and flags when saving', () => {
    const fixture = TestBed.createComponent(RequestStatusesComponent);
    fixture.detectChanges();
    http
      .match(() => true)
      .forEach((req) =>
        req.flush(
          req.request.url.endsWith('/request-statuses')
            ? empty
            : {
                data: req.request.url.includes('/forms')
                  ? forms
                  : [{ id: 3, actor_code: 'HOS', actor_name: 'Head of School', is_active: true }],
              },
        ),
      );
    const component = fixture.componentInstance;
    component.openCreateDialog();
    fixture.detectChanges();
    const pickers = fixture.debugElement.queryAll(By.directive(DropdownComponent));
    const form = pickers.find((el) => el.componentInstance.label === 'Form *')!
      .componentInstance as DropdownComponent;
    const actor = pickers.find((el) => el.componentInstance.label === 'Actor Type')!
      .componentInstance as DropdownComponent;
    form.choose('0');
    actor.choose('1');
    actor.choose('0');
    component.setField('status_code', 'PENDING');
    component.setField('status_name', 'Pending');
    component.setField('is_initial', true);
    component.save();
    const request = http.expectOne(
      (req) => req.method === 'POST' && req.url.endsWith('/request-statuses'),
    );
    expect(request.request.body).toMatchObject({
      form_id: 7,
      actor_type_id: null,
      status_code: 'PENDING',
      is_initial: true,
    });
    request.flush({ success: true, data: {} });
    expect(component.dialogMode()).toBeNull();
    http.expectOne((req) => req.url.endsWith('/request-statuses')).flush(empty);
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    fixture.destroy();
  });
});
