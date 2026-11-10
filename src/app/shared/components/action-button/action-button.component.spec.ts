import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { ActionButtonComponent } from './action-button.component';
import { TableActionIconComponent } from '../table-action-icon/table-action-icon.component';

describe('Shared icon actions', () => {
  it('uses the common Material icon for icon-only actions and preserves the accessible label', async () => {
    const fixture = TestBed.createComponent(ActionButtonComponent);
    fixture.componentRef.setInput('iconOnly', true);
    fixture.componentRef.setInput('icon', 'delete_outline');
    fixture.componentRef.setInput('label', 'Delete role');
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.directive(TableActionIconComponent)).componentInstance.action,
    ).toBe('delete');
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Delete role');
    expect(button.getAttribute('title')).toBe('Delete role');
    expect(button.getAttribute('data-action')).toBe('delete');
    expect(button.querySelector('.material-icons-outlined')?.textContent?.trim()).toBe(
      'delete_outline',
    );
    expect(button.querySelector('svg')).toBeNull();
    const clicked = vi.fn();
    fixture.componentInstance.clicked.subscribe(clicked);
    button.click();
    expect(clicked).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    button.click();
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('keeps labeled buttons and unmapped icons intact', () => {
    const fixture = TestBed.createComponent(ActionButtonComponent);
    fixture.componentRef.setInput('icon', 'edit');
    fixture.componentRef.setInput('label', 'Edit role');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.material-icons').textContent.trim()).toBe('edit');
    expect(fixture.nativeElement.querySelector('.action-button__label').textContent).toBe(
      'Edit role',
    );
    fixture.componentRef.setInput('iconOnly', true);
    fixture.componentRef.setInput('icon', 'refresh');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.material-icons-outlined').textContent.trim()).toBe(
      'refresh',
    );
  });
});
