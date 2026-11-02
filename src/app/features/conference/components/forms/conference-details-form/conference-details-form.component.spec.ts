import '@angular/compiler';
import { beforeEach, describe, expect, it } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
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

describe('ConferenceDetailsFormComponent sponsorship', () => {
  let component: ConferenceDetailsFormComponent;

  beforeEach(() => {
    component = Object.create(ConferenceDetailsFormComponent.prototype);
    component.form = new FormGroup({
      researchType: new FormControl('external-research'),
      percentage: new FormControl('85'),
      limit: new FormControl('5000'),
      sponsoredAmountExternal: new FormControl<string | null>(null),
      externalSponsoredAmountExternal: new FormControl<string | null>(null),
      localSponsoredAmountExternal: new FormControl<string | null>(null),
    });
    component.researchBreakdowns = [{ costInRM: 6000 }];
    component.externalBreakdowns = [{ costInRM: 6000 }];
    component.localBreakdowns = [{ costInRM: 6000 }];
  });

  it.each([null, '', '0', '1500', '6000'])(
    'balances grant funding with external sponsorship %s',
    (external) => {
      component.form.get('externalSponsoredAmountExternal')?.setValue(external);
      const expectedAmount = 6000 - Number(external || 0);
      expect(component.externalResearchSponsorshipByAPU).toBe(expectedAmount);
      expect(component.getCappedSponsorshipAmount(component.externalResearchSponsorshipByAPU))
        .toBe(expectedAmount);
      expect(component.externalResearchPercentage).toBe((expectedAmount / 6000) * 100);
      expect(component.externalCostBorneByApplicant).toBe(0);
    },
  );

  it('keeps non-grant sponsorship at the region cap with the applicant paying the balance', () => {
    component.form.get('researchType')?.setValue('non-research');
    expect(component.localSponsorshipAmountByAPU).toBe(5000);
    expect(component.localCostBorneByApplicant).toBe(1000);
  });

  it('keeps the legacy research calculation at the region cap', () => {
    component.form.get('researchType')?.setValue('research');
    expect(component.sponsorshipAmountByAPU).toBe(5000);
    expect(component.costBorneByApplicant).toBe(1000);
  });

  it('shows zero percentage and amounts when there are no costing items', () => {
    component.externalBreakdowns = [];
    expect(component.externalResearchSponsorshipByAPU).toBe(0);
    expect(component.externalResearchPercentage).toBe(0);
    expect(component.externalCostBorneByApplicant).toBe(0);
  });
});
