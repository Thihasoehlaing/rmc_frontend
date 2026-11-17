import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SystemAccessComponent } from './system-access.component';
import { SystemAccessService, SystemAccessDepartmentRule } from './system-access.service';
import { ToastService } from '../../../core/services/toast.service';

const departments = [
  {id: 1, name: 'School of Computing', department_type: 'PRIMARY', is_active: true, matched_rules: []},
  {id: 2, name: 'School of Business', department_type: 'PRIMARY', is_active: true, matched_rules: []},
];
const rule: SystemAccessDepartmentRule = {id: 8, rule_name: 'Schools', match_type: 'SELECTED', department_value: 'Selected departments', department_ids: [1, 2], is_active: true, created_by: null, updated_by: null, created_at: null, updated_at: null};

function setup() {
  const service = {
    getDepartmentOptions: vi.fn(() => of({data: departments})),
    createDepartmentRule: vi.fn(() => of({data: rule, message: 'Saved'})),
    updateDepartmentRule: vi.fn(() => of({data: rule, message: 'Saved'})),
    listDepartmentRules: vi.fn(() => of({data: {items: [rule], pagination: {total_items: 1, total_pages: 1}}})),
  };
  TestBed.configureTestingModule({providers: [
    {provide: SystemAccessService, useValue: service},
    {provide: ToastService, useValue: {success: vi.fn()}},
    {provide: ActivatedRoute, useValue: {}}, {provide: Router, useValue: {}},
  ]});
  return {component: TestBed.createComponent(SystemAccessComponent).componentInstance, service};
}

describe('department multi-select rules', () => {
  it('creates a rule with selected department IDs instead of typed names', () => {
    const {component, service} = setup();
    component.openCreateRule();
    component.ruleName.set('Schools'); component.selectedDepartmentIds.set([1, 2]);
    component.saveRule();
    expect(service.createDepartmentRule).toHaveBeenCalledWith({rule_name: 'Schools', match_type: 'SELECTED', department_ids: [1, 2], is_active: true});
  });

  it('restores selected department IDs when editing', () => {
    const {component} = setup();
    component.openEditRule(rule);
    expect(component.selectedDepartmentIds()).toEqual([1, 2]);
  });

  it('requires an explicit selection before saving', () => {
    const {component, service} = setup();
    component.openCreateRule(); component.ruleName.set('Schools'); component.saveRule();
    expect(service.createDepartmentRule).not.toHaveBeenCalled();
  });

  it('preselects the existing matches when converting a legacy prefix rule', () => {
    const {component} = setup();
    component.accessDepartments.set(departments);
    component.openEditRule({...rule, match_type: 'PREFIX', department_value: 'School of', department_ids: []});
    expect(component.selectedDepartmentIds()).toEqual([1, 2]);
  });
});
