import '@angular/compiler';

import { SimpleChange } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { AddOptionModalComponent, AddOptionPayload } from './add-option-modal.component';

describe('AddOptionModalComponent form sharing', () => {
  it('includes every selected form in the create payload', () => {
    const component = new AddOptionModalComponent();
    component.isOpen = true;
    component.defaultSelectedForms = ['CONFERENCE'];
    component.ngOnChanges({
      isOpen: new SimpleChange(false, true, true),
    });

    component.onToggleForm('JOURNAL');

    let saved: AddOptionPayload | undefined;
    component.save.subscribe((payload) => (saved = payload));
    component.name = 'Company';
    component.onSave();

    expect(saved?.appliesTo).toEqual(['CONFERENCE', 'JOURNAL']);
  });

  it('does not discard a form selected while editing when initial is rebound', () => {
    const component = new AddOptionModalComponent();
    const initial: AddOptionPayload = {
      name: 'Company',
      status: 'Active',
      appliesTo: ['CONFERENCE'],
    };
    component.isOpen = true;
    component.initial = initial;
    component.ngOnChanges({
      isOpen: new SimpleChange(false, true, true),
      initial: new SimpleChange(null, initial, true),
    });

    component.onToggleForm('JOURNAL');

    const reboundInitial: AddOptionPayload = {
      ...initial,
      appliesTo: [...initial.appliesTo],
    };
    component.initial = reboundInitial;
    component.ngOnChanges({
      initial: new SimpleChange(initial, reboundInitial, false),
    });

    let saved: AddOptionPayload | undefined;
    component.save.subscribe((payload) => (saved = payload));
    component.onSave();

    expect(saved?.appliesTo).toEqual(['CONFERENCE', 'JOURNAL']);
  });
  it('preserves the chosen inactive status and prevents duplicate saves while busy', () => {
    const component = new AddOptionModalComponent();
    component.name = 'External Research';
    component.allowFormSharing = false;
    component.status = 'Inactive';
    const saved: AddOptionPayload[] = [];
    component.save.subscribe((payload) => saved.push(payload));
    component.onSave();
    component.isSaving = true;
    component.onSave();
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe('Inactive');
    let closed = false;
    component.close.subscribe(() => (closed = true));
    component.onCancel();
    expect(closed).toBe(false);
  });
});
