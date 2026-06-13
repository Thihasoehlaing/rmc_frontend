import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConferenceSettingsComponent } from './conference-settings.component';
import { BreakdownOptionsService } from '../../services/breakdown-options.service';

describe('ConferenceSettingsComponent', () => {
  let component: ConferenceSettingsComponent;
  let fixture: ComponentFixture<ConferenceSettingsComponent>;
  let breakdownService: BreakdownOptionsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConferenceSettingsComponent],
      providers: [BreakdownOptionsService]
    }).compileComponents();

    fixture = TestBed.createComponent(ConferenceSettingsComponent);
    component = fixture.componentInstance;
    breakdownService = TestBed.inject(BreakdownOptionsService);
    localStorage.clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with research breakdown type selected', () => {
    expect(component.selectedBreakdownType()).toBe('research');
  });

  it('should load current options on init', () => {
    expect(component.currentOptions().length).toBeGreaterThan(0);
  });

  it('should switch breakdown types', () => {
    component.selectBreakdownType('local');
    expect(component.selectedBreakdownType()).toBe('local');
  });

  it('should open add form', () => {
    component.openAddForm();
    expect(component.showAddForm).toBeTruthy();
    expect(component.editingOption).toBeNull();
  });

  it('should close add form', () => {
    component.openAddForm();
    component.closeAddForm();
    expect(component.showAddForm).toBeFalsy();
  });

  it('should open edit form with option data', () => {
    const option = component.currentOptions()[0];
    component.openEditForm(option);
    expect(component.showAddForm).toBeTruthy();
    expect(component.editingOption).toBe(option);
    expect(component.breakdownForm.get('value')?.value).toBe(option.value);
  });

  it('should add new option', () => {
    const initialCount = component.currentOptions().length;
    component.openAddForm();
    component.breakdownForm.patchValue({
      value: 'newtest',
      label: 'New Test Option'
    });
    component.saveOption();
    expect(component.currentOptions().length).toBe(initialCount + 1);
    expect(component.successMessage).toBeTruthy();
  });

  it('should show error on invalid form submission', () => {
    component.openAddForm();
    component.breakdownForm.reset();
    component.saveOption();
    expect(component.errorMessage).toBeTruthy();
  });

  it('should delete option with confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const initialCount = component.currentOptions().length;
    const option = component.currentOptions()[0];
    component.deleteOption(option);
    expect(component.currentOptions().length).toBeLessThan(initialCount);
  });

  it('should reset to defaults with confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.breakdownForm.patchValue({
      value: 'temptest',
      label: 'Temp Test'
    });
    component.openAddForm();
    component.saveOption();
    expect(component.currentOptions().length).toBeGreaterThan(0);
    component.resetToDefaults();
    const hasTempTest = component.currentOptions().some(o => o.value === 'temptest');
    expect(hasTempTest).toBeFalsy();
  });
});
