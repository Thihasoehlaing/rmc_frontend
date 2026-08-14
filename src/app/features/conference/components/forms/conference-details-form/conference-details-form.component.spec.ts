import '@angular/compiler';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConferenceDetailsFormComponent } from './conference-details-form.component';

describe('ConferenceDetailsFormComponent costing rows', () => {
  let component: ConferenceDetailsFormComponent;

  beforeEach(() => {
    component = Object.create(ConferenceDetailsFormComponent.prototype);
    component.researchBreakdowns = [];
    component.externalBreakdowns = [];
    component.localBreakdowns = [];
    Object.defineProperty(component, 'tableRecordLimit', { value: 30 });
  });

  it('keeps all 30 costing rows available to the table', () => {
    component.externalBreakdowns = Array.from({ length: 30 }, (_, index) => ({
      itemDescription: `Costing item ${index + 1}`,
    }));

    const rows = component.getExternalBreakdownTableData();

    expect(rows).toHaveLength(30);
    expect(rows[0].index).toBe(1);
    expect(rows[29].index).toBe(30);
  });

  it('allows adding row 30 and disables adding after reaching 30 rows', () => {
    component.externalBreakdowns = Array.from({ length: 29 }, () => ({}));
    expect(component.canCreateBreakdownEntry('external-research')).toBe(true);

    component.externalBreakdowns.push({});
    expect(component.canCreateBreakdownEntry('external-research')).toBe(false);
  });
});
