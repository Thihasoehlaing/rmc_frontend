import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DecimalAmountDirective } from './decimal-amount.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DecimalAmountDirective],
  template: '<input appDecimalAmount inputmode="decimal" [formControl]="amount" />',
})
class TestHostComponent {
  readonly amount = new FormControl<number | null>(null);
}

describe('DecimalAmountDirective', () => {
  async function createHost() {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    return {
      fixture,
      component: fixture.componentInstance,
      input: fixture.nativeElement.querySelector('input') as HTMLInputElement,
    };
  }

  it('groups thousands and keeps two decimal places', async () => {
    const { component, input } = await createHost();

    input.value = '1234567.89';
    input.dispatchEvent(new Event('input'));

    expect(input.value).toBe('1,234,567.89');
    expect(component.amount.value).toBe(1234567.89);
  });

  it('limits input to one decimal point and two decimal places', async () => {
    const { component, input } = await createHost();

    input.value = '12a34.567.8';
    input.dispatchEvent(new Event('input'));

    expect(input.value).toBe('1,234.56');
    expect(component.amount.value).toBe(1234.56);
  });

  it('renders programmatic values with grouped thousands and decimals', async () => {
    const { fixture, component, input } = await createHost();

    component.amount.setValue(2500.5);
    fixture.detectChanges();

    expect(input.value).toBe('2,500.50');
  });

  it('adds decimal places when the field loses focus', async () => {
    const { component, input } = await createHost();

    input.value = '1234';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));

    expect(input.value).toBe('1,234.00');
    expect(component.amount.value).toBe(1234);
  });
});
