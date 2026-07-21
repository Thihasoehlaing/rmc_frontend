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
});
