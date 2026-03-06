import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationMessageComponent } from './validation-message.component';

describe('ValidationMessageComponent', () => {
  let component: ValidationMessageComponent;
  let fixture: ComponentFixture<ValidationMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationMessageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
