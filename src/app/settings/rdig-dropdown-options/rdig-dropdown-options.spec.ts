import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdigDropdownOptions } from './rdig-dropdown-options';

describe('RdigDropdownOptions', () => {
  let component: RdigDropdownOptions;
  let fixture: ComponentFixture<RdigDropdownOptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdigDropdownOptions],
    }).compileComponents();

    fixture = TestBed.createComponent(RdigDropdownOptions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
