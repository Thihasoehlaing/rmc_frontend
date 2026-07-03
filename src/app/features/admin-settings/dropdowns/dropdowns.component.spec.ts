import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownsComponent } from './dropdowns.component';

describe('DropdownsComponent', () => {
  let component: DropdownsComponent;
  let fixture: ComponentFixture<DropdownsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DropdownsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should deactivate an active dropdown option', () => {
    component.dropdownOptions.set([
      {
        id: 1,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'ASEAN',
        lastUpdated: '20 Jun 2026',
        createdBy: 'Admin',
        status: 'Active',
      },
    ]);

    component.toggleStatus(1);

    expect(component.dropdownOptions()[0].status).toBe('Inactive');
  });

  it('should activate an inactive dropdown option', () => {
    component.dropdownOptions.set([
      {
        id: 1,
        formName: 'Conference Application',
        category: 'Select Region',
        value: 'ASEAN',
        lastUpdated: '20 Jun 2026',
        createdBy: 'Admin',
        status: 'Inactive',
      },
    ]);

    component.toggleStatus(1);

    expect(component.dropdownOptions()[0].status).toBe('Active');
  });
});
