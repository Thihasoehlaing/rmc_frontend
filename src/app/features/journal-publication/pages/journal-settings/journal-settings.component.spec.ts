import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JournalSettingsComponent } from './journal-settings.component';

describe('JournalSettingsComponent', () => {
  let component: JournalSettingsComponent;
  let fixture: ComponentFixture<JournalSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalSettingsComponent]
    }).compileComponents();

    localStorage.clear();
    fixture = TestBed.createComponent(JournalSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with the first journal category selected', () => {
    expect(component.selectedBreakdownType()).toBe('vote_number_description');
  });

  it('should expose four journal option categories', () => {
    expect(component.breakdownTypeOptions.map(option => option.value)).toEqual([
      'vote_number_description',
      'vote_number',
      'account_code_description',
      'account_code'
    ]);
  });

  it('should open and close the option modal', () => {
    component.openAddModal();
    expect(component.isModalOpen()).toBeTrue();

    component.closeModal();
    expect(component.isModalOpen()).toBeFalse();
  });
});
