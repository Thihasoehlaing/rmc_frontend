import { By } from '@angular/platform-browser';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '../../../core/services/toast.service';
import { GroupsComponent } from './groups.component';
import { Group } from './groups.service';
import { SHARED_SETTINGS_MODULES } from '../settings.config';

const group: Group = {
  id: 1,
  group_code: 'CHANCELLORY',
  group_name: 'Chancellory',
  user_count: 1,
  code_locked: true,
  can_delete: false,
  restriction_reason: 'Built-in group',
  members: [
    {
      user_id: 5,
      staff_id: 22,
      username: 'staff.one',
      fullname: 'Staff One',
      email: 'one@example.test',
    },
  ],
};

describe('Groups staff assignment', () => {
  let http: HttpTestingController;
  let component: GroupsComponent;
  let fixture: ComponentFixture<GroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: { success: () => {} } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GroupsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify({ ignoreCancelled: true }));

  it('places Groups between Roles and System Access in shared navigation', () => {
    const keys = SHARED_SETTINGS_MODULES.map((module) => module.key);
    expect(keys.slice(keys.indexOf('roles'), keys.indexOf('roles') + 3)).toEqual([
      'roles',
      'groups',
      'system-access',
    ]);
  });

  it('loads the staff-options API and saves selected staff IDs', () => {
    component.openCreateDialog();
    const options = http.expectOne((req) => req.url.endsWith('/master-data/staff-options'));
    expect(options.request.params.get('purpose')).toBe('staff');
    options.flush({
      data: [
        { staff_id: 22, username: 'staff.one', fullname: 'Staff One', email: '', department: '' },
      ],
    });
    component.groupCode.set('REVIEWERS');
    component.groupName.set('Reviewers');
    component.selectedStaffIds.set([22]);
    component.saveGroup();
    const save = http.expectOne((req) => req.url.endsWith('/settings/groups'));
    expect(save.request.method).toBe('POST');
    expect(save.request.body.staff_ids).toEqual([22]);
    save.flush({ data: { ...group, id: 2 } });
    http
      .expectOne((req) => req.url.endsWith('/settings/groups'))
      .flush({
        data: {
          items: [],
          pagination: { total_pages: 0, total_items: 0 },
        },
      });
  });

  it('retains selected staff labels when staff options omit existing members', () => {
    component.openEditDialog(group);
    http.expectOne((req) => req.url.endsWith('/settings/groups/1')).flush({ data: group });
    http.expectOne((req) => req.url.endsWith('/master-data/staff-options')).flush({ data: [] });
    expect(component.selectedStaffIds()).toEqual([22]);
    expect(component.staffDropdownOptions()[0].label).toContain('Staff One');
    component.selectedStaffIds.set([]);
    component.saveGroup();
    const update = http.expectOne((req) => req.url.endsWith('/settings/groups/1'));
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.staff_ids).toEqual([]);
    update.flush({ data: group });
    http
      .expectOne((req) => req.url.endsWith('/settings/groups'))
      .flush({
        data: {
          items: [],
          pagination: { total_pages: 0, total_items: 0 },
        },
      });
  });

  it('renders existing selected staff in the edit modal even when absent from staff options', async () => {
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/settings/groups'))
      .flush({
        data: {
          items: [group],
          pagination: { total_pages: 1, total_items: 1 },
        },
      });
    fixture.componentInstance.openEditDialog(group);
    http.expectOne((req) => req.url.endsWith('/settings/groups/1')).flush({ data: group });
    http.expectOne((req) => req.url.endsWith('/master-data/staff-options')).flush({ data: [] });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const selected = fixture.nativeElement.querySelector('.selection-summary');
    expect(selected.textContent).toContain('Staff One (staff.one)');
    expect(selected.textContent).toContain('one@example.test');
    expect(fixture.nativeElement.querySelector('.chip-label').textContent).toContain('Staff One');
    fixture.componentInstance.selectedStaffIds.set([]);
    fixture.detectChanges();
    expect(selected.textContent).toContain('No staff selected.');
    fixture.destroy();
  });

  it('filters the fetched staff array locally without another API request', async () => {
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/settings/groups'))
      .flush({
        data: {
          items: [group],
          pagination: { total_pages: 1, total_items: 1 },
        },
      });
    component.openEditDialog(group);
    http.expectOne((req) => req.url.endsWith('/settings/groups/1')).flush({ data: group });
    http
      .expectOne((req) => req.url.endsWith('/master-data/staff-options'))
      .flush({
        data: [
          { staff_id: 22, username: 'staff.one', fullname: 'Staff One', email: '', department: '' },
          {
            staff_id: 23,
            username: 'other.staff',
            fullname: 'Another Person',
            email: '',
            department: '',
          },
        ],
      });
    fixture.detectChanges();
    await fixture.whenStable();
    const picker = fixture.debugElement
      .queryAll(By.directive(SearchableDropdownComponent))
      .find((element) => element.componentInstance.label === 'Staff members')!
      .componentInstance as SearchableDropdownComponent<number>;
    picker.searchCtrl.setValue('other.staff');
    await new Promise((resolve) => setTimeout(resolve, 200));
    fixture.detectChanges();
    expect(picker.filteredOptions().map((option) => option.value)).toEqual([23]);
    expect(component.selectedStaffIds()).toEqual([22]);
    expect(picker.getChipLabel(22)).toContain('Staff One');
    http.expectNone((req) => req.url.endsWith('/master-data/staff-options'));
    fixture.destroy();
  });

  it('cancels a detail request when the editor is closed', () => {
    component.openEditDialog(group);
    const detail = http.expectOne((req) => req.url.endsWith('/settings/groups/1'));
    component.closeEditor();
    expect(detail.cancelled).toBe(true);
    expect(component.dialogMode()).toBe(null);
  });
});
