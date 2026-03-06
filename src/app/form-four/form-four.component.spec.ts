import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormFourComponent } from './form-four.component';

describe('FormFourComponent', () => {
  let component: FormFourComponent;
  let fixture: ComponentFixture<FormFourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFourComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFourComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
