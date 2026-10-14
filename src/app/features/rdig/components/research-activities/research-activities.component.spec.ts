import '@angular/compiler';
import { FormArray, FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { ResearchActivitiesComponent } from './research-activities.component';

describe('RDIG activity month numbering', () => {
  function createComponent() {
    const fb = new FormBuilder();
    const component = new ResearchActivitiesComponent(fb);
    component.parentForm = fb.group({ activities: fb.array([]) });
    component.workflow = { isFormReadOnly: () => false } as unknown as ResearchActivitiesComponent['workflow'];
    return component;
  }

  it('shows exactly months 1 through 12', () => {
    expect(createComponent().months()).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it('starts a new activity at month 1 with a one-month duration', () => {
    const component = createComponent();
    component.addActivity();
    const activity = (component.parentForm.get('activities') as FormArray).at(0);
    expect(activity.getRawValue()).toMatchObject({ startMonth: 1, endMonth: 1, duration: 1 });
    expect(component.getTimeline(1, 1).filter(Boolean)).toHaveLength(1);
    activity.patchValue({ endMonth: 12 });
    expect(activity.get('duration')?.value).toBe(12);
  });

  it('corrects a legacy month zero when editing an activity', () => {
    const component = createComponent();
    component.addActivity();
    const activity = component.activities.at(0);
    activity.patchValue({ startMonth: 0, endMonth: 0 });
    expect(activity.getRawValue()).toMatchObject({ startMonth: 1, endMonth: 1, duration: 1 });
  });
});
