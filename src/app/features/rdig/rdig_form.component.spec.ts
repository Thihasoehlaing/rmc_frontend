import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdigApplicationComponent } from './rdig_form.component';

describe('RdigApplicationComponent', () => {
  let component: RdigApplicationComponent;
  let fixture: ComponentFixture<RdigApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdigApplicationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RdigApplicationComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
