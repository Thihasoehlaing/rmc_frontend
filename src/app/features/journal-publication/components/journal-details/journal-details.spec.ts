import '@angular/compiler';
import { beforeEach, describe, expect, it } from 'vitest';
import { COSTING_ITEM_ROW_LIMIT } from '../../../../core/constants/form-limits.constant';
import { JournalDetails } from './journal-details';

describe('JournalDetails costing rows', () => {
  let component: JournalDetails;

  beforeEach(() => {
    component = Object.create(JournalDetails.prototype);
    component.workflow = { isFormReadOnly: () => false } as unknown as JournalDetails['workflow'];
    component.researchBreakdowns = [];
    component.externalBreakdowns = [];
    component.NonResearchBreakdowns = [];
    Object.defineProperty(component, 'tableRecordLimit', { value: COSTING_ITEM_ROW_LIMIT });
  });

  it('keeps all 30 costing rows available to the table', () => {
    component.NonResearchBreakdowns = Array.from({ length: COSTING_ITEM_ROW_LIMIT }, (_, index) => ({
      itemDescription: `Costing item ${index + 1}`,
    }));

    const rows = component.getBreakdownArray('non-research');

    expect(rows).toHaveLength(COSTING_ITEM_ROW_LIMIT);
    expect(rows[0].itemDescription).toBe('Costing item 1');
    expect(rows[COSTING_ITEM_ROW_LIMIT - 1].itemDescription).toBe(
      `Costing item ${COSTING_ITEM_ROW_LIMIT}`,
    );
  });

  it('allows adding row 30 and disables adding after reaching 30 rows', () => {
    component.NonResearchBreakdowns = Array.from({ length: COSTING_ITEM_ROW_LIMIT - 1 }, () => ({}));
    expect(component.canCreateBreakdownEntry('non-research')).toBe(true);

    component.NonResearchBreakdowns.push({});
    expect(component.canCreateBreakdownEntry('non-research')).toBe(false);
  });
});
