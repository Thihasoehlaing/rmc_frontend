import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  FormAlertComponent,
  ValidationSummaryComponent,
  ValidationSummaryItem,
} from './form-standard.components';

describe('Form standard components', () => {
  it('renders an error alert with alert semantics', async () => {
    await TestBed.configureTestingModule({ imports: [FormAlertComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FormAlertComponent);
    fixture.componentRef.setInput('intent', 'error');
    fixture.componentRef.setInput('title', 'Submission failed');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Submission failed');
  });

  it('emits the selected validation item', async () => {
    await TestBed.configureTestingModule({ imports: [ValidationSummaryComponent] }).compileComponents();
    const fixture: ComponentFixture<ValidationSummaryComponent> =
      TestBed.createComponent(ValidationSummaryComponent);
    const item: ValidationSummaryItem = { label: 'Project Title', step: 2 };
    const emitted: ValidationSummaryItem[] = [];
    fixture.componentInstance.itemSelected.subscribe(value => emitted.push(value));
    fixture.componentRef.setInput('items', [item]);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('button')).triggerEventHandler('click');

    expect(emitted).toEqual([item]);
  });
});
