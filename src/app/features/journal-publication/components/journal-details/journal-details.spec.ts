import '@angular/compiler';
import { beforeEach, describe, expect, it } from 'vitest';
import { COSTING_ITEM_ROW_LIMIT } from '../../../../core/constants/form-limits.constant';
import { JournalDetails } from './journal-details';
import { FormControl, FormGroup } from '@angular/forms';

describe('JournalDetails costing rows', () => {
  let component: JournalDetails;

  beforeEach(() => {
    component = Object.create(JournalDetails.prototype);
    component.workflow = { isFormReadOnly: () => false } as unknown as JournalDetails['workflow'];
    component.externalBreakdowns = [];
    component.NonResearchBreakdowns = [];
    Object.defineProperty(component, 'tableRecordLimit', { value: COSTING_ITEM_ROW_LIMIT });
    Object.defineProperty(component, 'projectCostMax', { value: 5 });
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

  it('enforces the existing five-row non-research limit', () => {
    component.NonResearchBreakdowns = Array.from({ length: 4 }, () => ({}));
    expect(component.canCreateBreakdownEntry('non-research')).toBe(true);

    component.NonResearchBreakdowns.push({});
    expect(component.canCreateBreakdownEntry('non-research')).toBe(false);
  });

  it('allows internal research rows up to the thirty-row research limit', () => {
    component.externalBreakdowns = Array.from({ length: COSTING_ITEM_ROW_LIMIT - 1 }, () => ({}));
    expect(component.canCreateBreakdownEntry('internal-research')).toBe(true);
    component.externalBreakdowns.push({});
    expect(component.canCreateBreakdownEntry('internal-research')).toBe(false);
  });

  it('uses the research costing flow for both internal and external projects', () => {
    expect(component.isResearchProject('internal-research')).toBe(true);
    expect(component.isResearchProject('external-research')).toBe(true);
    expect(component.isResearchProject('non-research')).toBe(false);
    component.externalBreakdowns = [{ accountCode: 'INTERNAL' }];
    expect(component.getBreakdownArray('internal-research')).toEqual([{ accountCode: 'INTERNAL' }]);
  });

  it('clears Q3 when switching to internal research but keeps it for external research', () => {
    component.form = new FormGroup({ scopusQuartile: new FormControl('Q3') });
    component['syncScopusQuartileForResearchType']('external-research');
    expect(component.form.get('scopusQuartile')?.value).toBe('Q3');
    component['syncScopusQuartileForResearchType']('internal-research');
    expect(component.form.get('scopusQuartile')?.value).toBe('');
  });
});
