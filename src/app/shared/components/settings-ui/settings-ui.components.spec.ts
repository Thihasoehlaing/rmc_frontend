import { SearchableDropdownComponent } from '../searchable-dropdown/searchable-dropdown.component';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActionButtonComponent } from '../action-button/action-button.component';
import { DialogComponent } from '../dialog/dialog.component';
import {
  FieldComponent,
  InputDirective,
  SearchToolbarComponent,
  SelectionSummaryComponent,
} from './settings-ui.components';

@Component({
  standalone: true,
  imports: [FieldComponent, InputDirective],
  template: `<app-field
    label="Group code"
    controlId="test-code"
    hint="Unique code"
    error="Invalid code"
    [required]="true"
  >
    <input
      appInput
      id="test-code"
      [invalid]="true"
      aria-describedby="test-code-hint test-code-error"
    />
  </app-field>`,
})
class FieldHost {}

describe('Shared compact components', () => {
  it('connects field labels, hints and errors to the native input', async () => {
    await TestBed.configureTestingModule({ imports: [FieldHost] }).compileComponents();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('label').htmlFor).toBe('test-code');
    expect(fixture.nativeElement.querySelector('#test-code-hint').textContent).toContain(
      'Unique code',
    );
    expect(fixture.nativeElement.querySelector('#test-code-error').textContent).toContain(
      'Invalid code',
    );
    expect(fixture.nativeElement.querySelector('input').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('input').classList.contains('input--text')).toBe(
      true,
    );
  });

  it('uses one search event for a submit and keeps reset separate', async () => {
    await TestBed.configureTestingModule({ imports: [SearchToolbarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SearchToolbarComponent);
    let searches = 0,
      resets = 0;
    fixture.componentInstance.search.subscribe(() => searches++);
    fixture.componentInstance.reset.subscribe(() => resets++);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    expect(searches).toBe(1);
    const actions = fixture.debugElement.queryAll(By.directive(ActionButtonComponent));
    actions[1].nativeElement.querySelector('button').click();
    expect(resets).toBe(1);
    expect(searches).toBe(1);
  });

  it('disables busy action buttons and provides names for icon actions', async () => {
    await TestBed.configureTestingModule({ imports: [ActionButtonComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ActionButtonComponent);
    fixture.componentRef.setInput('label', 'Delete group');
    fixture.componentRef.setInput('iconOnly', true);
    fixture.componentRef.setInput('icon', 'delete_outline');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Delete group');
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('renders selected staff and updates the empty state', async () => {
    await TestBed.configureTestingModule({
      imports: [SelectionSummaryComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(SelectionSummaryComponent);
    fixture.componentRef.setInput('items', [
      { value: 1, label: 'Aisha', description: 'aisha@example.test' },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('aisha@example.test');
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No staff selected.');
  });

  it('keeps dropdown Enter and Escape inside the picker rather than submitting or closing a dialog', async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableDropdownComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(SearchableDropdownComponent);
    fixture.detectChanges();
    const picker = fixture.componentInstance;
    picker.open();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    picker.onKeyDown(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(picker.isOpen()).toBe(true);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    picker.onKeyDown(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(escape.cancelBubble).toBe(true);
    expect(picker.isOpen()).toBe(false);
  });

  it('honours the dialog close guard for Escape and backdrop clicks', async () => {
    await TestBed.configureTestingModule({ imports: [DialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DialogComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('closeDisabled', true);
    fixture.componentRef.setInput('density', 'compact');
    let closes = 0;
    fixture.componentInstance.close.subscribe(() => closes++);
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    overlay.click();
    expect(closes).toBe(0);
    fixture.componentRef.setInput('closeDisabled', false);
    fixture.detectChanges();
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closes).toBe(1);
    fixture.destroy();
  });
});
