import '@angular/compiler';
import { beforeEach, describe, expect, it } from 'vitest';
import { COSTING_ITEM_ROW_LIMIT } from '../../../../../core/constants/form-limits.constant';
import { ConferenceDetailsFormComponent } from './conference-details-form.component';

describe('ConferenceDetailsFormComponent costing rows', () => {
  let component: ConferenceDetailsFormComponent;

  beforeEach(() => {
    component = Object.create(ConferenceDetailsFormComponent.prototype);
    component.researchBreakdowns = [];
    component.externalBreakdowns = [];
    component.localBreakdowns = [];
    Object.defineProperty(component, 'tableRecordLimit', { value: COSTING_ITEM_ROW_LIMIT });
  });

  it('keeps all 30 costing rows available to the table', () => {
    component.externalBreakdowns = Array.from({ length: COSTING_ITEM_ROW_LIMIT }, (_, index) => ({
      itemDescription: `Costing item ${index + 1}`,
    }));

    const rows = component.getExternalBreakdownTableData();

    expect(rows).toHaveLength(COSTING_ITEM_ROW_LIMIT);
    expect(rows[0].index).toBe(1);
    expect(rows[COSTING_ITEM_ROW_LIMIT - 1].index).toBe(COSTING_ITEM_ROW_LIMIT);
  });

  it('allows adding row 30 and disables adding after reaching 30 rows', () => {
    component.externalBreakdowns = Array.from({ length: COSTING_ITEM_ROW_LIMIT - 1 }, () => ({}));
    expect(component.canCreateBreakdownEntry('external-research')).toBe(true);

    component.externalBreakdowns.push({});
    expect(component.canCreateBreakdownEntry('external-research')).toBe(false);
  });
});
