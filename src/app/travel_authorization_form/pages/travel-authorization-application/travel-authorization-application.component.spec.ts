import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelAuthorizationApplicationComponent } from './travel-authorization-application.component';

describe('TravelAuthorizationApplicationComponent', () => {
  let component: TravelAuthorizationApplicationComponent;
  let fixture: ComponentFixture<TravelAuthorizationApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelAuthorizationApplicationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelAuthorizationApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sanitize decimal fields and reject negative or non-numeric characters', () => {
    component.expenseForm.get('amountForeignCurrency')?.setValue('-12a.3');

    component.onDecimalFieldInput('amountForeignCurrency');

    expect(component.expenseForm.get('amountForeignCurrency')?.value).toBe('12.3');
  });

  it('should calculate MYR from sanitized numeric inputs', () => {
    component.expenseForm.get('amountForeignCurrency')?.setValue('10.50');
    component.expenseForm.get('exchangeRate')?.setValue('4');

    component.calculateMYR();

    expect(component.expenseForm.get('amountMYR')?.value).toBe('42.00');
  });
});
