import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { UsersComponent } from './users.component';
import { UsersService } from './users.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { ToastService } from '../../../core/services/toast.service';

const user = {id: 3, username: 'sample', fullname: 'Sample Staff', email: 'sample@apu.edu.my', job_title: 'Staff', role_id: 7, role_code: 'APPLICANT', role_name: 'Applicant', is_student: false,
  workspace_roles: [
    {workspace_id: 1, workspace_code: 'RMC', workspace_name: 'RMC', role_id: 7, role_code: 'APPLICANT', role_name: 'Applicant', role_source: 'default', is_active: true},
    {workspace_id: 2, workspace_code: 'HR_SERVICES', workspace_name: 'HR Services', role_id: 20, role_code: 'HR_ADMIN', role_name: 'HR Admin', role_source: 'workspace', is_active: true},
  ],
};

function setup() {
  const list = vi.fn(() => of({message: 'OK', data: {items: [user], pagination: {total_items: 1, total_pages: 1}}}));
  TestBed.configureTestingModule({providers: [
    {provide: UsersService, useValue: {list, listRoleOptions: () => of({data: []}), listDepartments: () => of({data: []})}},
    {provide: WorkspaceService, useValue: {}},
    {provide: ToastService, useValue: {success: vi.fn()}},
  ]});
  const fixture = TestBed.createComponent(UsersComponent);
  fixture.detectChanges();
  return fixture;
}

describe('Users table workspace role display', () => {
  it('renders the roles under their correct workspace labels', () => {
    const fixture = setup();
    const summary = fixture.nativeElement.querySelector('.user-role-summary').textContent;
    expect(summary).toContain('RMC'); expect(summary).toContain('Applicant');
    expect(summary).toContain('HR'); expect(summary).toContain('HR Admin');
  });

  it('uses the shared horizontal action group with both tooltips', () => {
    const fixture = setup();
    const actions = fixture.nativeElement.querySelector('tbody .data-table__actions');
    expect(actions).toBeTruthy();
    const buttons = actions.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].title).toBe('Workspace access');
    expect(buttons[1].title).toBe('Platform / default RMC role');
  });
});
