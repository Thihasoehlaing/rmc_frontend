import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { formatDisplayDate } from '../../../shared/utils/date-time.util';
import {
  AccessStatus,
  AccessType,
  DecisionFilter,
  MatchType,
  SystemAccessAuditLog,
  SystemAccessDepartmentRule,
  SystemAccessDepartmentRulePayload,
  SystemAccessService,
  StaffOption,
  SystemAccessUser,
  SystemAccessUserPayload,
} from './system-access.service';

type AccessTab = 'users' | 'departments' | 'audit';
type UserDialogMode = 'create' | 'edit';
type RuleDialogMode = 'create' | 'edit';

interface AccessTabConfig {
  key: AccessTab;
  label: string;
  title: string;
  description: string;
  createLabel?: string;
  emptyIcon: string;
  columns: readonly DataTableColumn[];
}

const USER_COLUMNS: readonly DataTableColumn[] = [
  { key: 'number', label: 'No.', width: '72px', align: 'center', headerAlign: 'center' },
  { key: 'username', label: 'Username', width: '220px' },
  { key: 'access', label: 'Access', width: '120px', align: 'center', headerAlign: 'center' },
  { key: 'reason', label: 'Reason', width: '320px' },
  { key: 'status', label: 'Status', width: '120px', align: 'center', headerAlign: 'center' },
  { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
];

const RULE_COLUMNS: readonly DataTableColumn[] = [
  { key: 'number', label: 'No.', width: '72px', align: 'center', headerAlign: 'center' },
  { key: 'rule', label: 'Rule', width: '260px' },
  { key: 'match', label: 'Match', width: '120px', align: 'center', headerAlign: 'center' },
  { key: 'department', label: 'Department Value', width: '320px' },
  { key: 'status', label: 'Status', width: '120px', align: 'center', headerAlign: 'center' },
  { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
];

const AUDIT_COLUMNS: readonly DataTableColumn[] = [
  { key: 'number', label: 'No.', width: '72px', align: 'center', headerAlign: 'center' },
  { key: 'username', label: 'Username', width: '220px' },
  { key: 'decision', label: 'Decision', width: '120px', align: 'center', headerAlign: 'center' },
  { key: 'reason', label: 'Reason', width: '320px' },
  { key: 'department', label: 'Department', width: '220px' },
  { key: 'matchedRule', label: 'Matched Rule', width: '170px' },
  { key: 'attempted', label: 'Attempted', width: '180px' },
];

const TABS: readonly AccessTabConfig[] = [
  {
    key: 'users',
    label: 'User Access',
    title: 'User Access',
    description: 'Exact username allow and deny rules. Deny rules have priority.',
    createLabel: 'Add User Rule',
    emptyIcon: 'verified_user',
    columns: USER_COLUMNS,
  },
  {
    key: 'departments',
    label: 'Department Rules',
    title: 'Department Rules',
    description: 'Department-name access rules such as School of, DLH, I&E, and SRI.',
    createLabel: 'Add Department Rule',
    emptyIcon: 'apartment',
    columns: RULE_COLUMNS,
  },
  {
    key: 'audit',
    label: 'Audit Logs',
    title: 'Audit Logs',
    description: 'Read-only access decisions written during authentication checks.',
    emptyIcon: 'fact_check',
    columns: AUDIT_COLUMNS,
  },
];

@Component({
  selector: 'app-system-access',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './system-access.component.html',
  styleUrls: ['../forms/forms.component.scss', './system-access.component.scss'],
})
export class SystemAccessComponent implements OnInit {
  private readonly systemAccessService = inject(SystemAccessService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tabs = TABS;
  readonly activeTab = signal<AccessTab>('users');
  readonly pageSizeOptions = [5, 10, 15, 30, 50];

  readonly users = signal<SystemAccessUser[]>([]);
  readonly userSearch = signal('');
  readonly userStatus = signal<AccessStatus>('');
  readonly userAccessType = signal<'' | AccessType>('');
  readonly userPage = signal(1);
  readonly userPageSize = signal(10);
  readonly userTotalItems = signal(0);
  readonly userTotalPages = signal(1);
  readonly usersLoading = signal(false);
  readonly usersFailed = signal(false);

  readonly userDialogMode = signal<UserDialogMode | null>(null);
  readonly selectedUser = signal<SystemAccessUser | null>(null);
  readonly userUsername = signal('');
  readonly userType = signal<AccessType>('ALLOW');
  readonly userReason = signal('');
  readonly userActive = signal(true);
  readonly staffOptions = signal<StaffOption[]>([]);
  readonly staffOptionsLoading = signal(false);

  readonly departmentRules = signal<SystemAccessDepartmentRule[]>([]);
  readonly ruleSearch = signal('');
  readonly ruleStatus = signal<AccessStatus>('');
  readonly ruleMatchType = signal<'' | MatchType>('');
  readonly rulePage = signal(1);
  readonly rulePageSize = signal(10);
  readonly ruleTotalItems = signal(0);
  readonly ruleTotalPages = signal(1);
  readonly rulesLoading = signal(false);
  readonly rulesFailed = signal(false);

  readonly ruleDialogMode = signal<RuleDialogMode | null>(null);
  readonly selectedRule = signal<SystemAccessDepartmentRule | null>(null);
  readonly ruleName = signal('');
  readonly ruleType = signal<MatchType>('EXACT');
  readonly departmentValue = signal('');
  readonly ruleActive = signal(true);

  readonly auditLogs = signal<SystemAccessAuditLog[]>([]);
  readonly auditSearch = signal('');
  readonly auditDecision = signal<DecisionFilter>('');
  readonly auditRuleType = signal('');
  readonly auditPage = signal(1);
  readonly auditPageSize = signal(10);
  readonly auditTotalItems = signal(0);
  readonly auditTotalPages = signal(1);
  readonly auditLoading = signal(false);
  readonly auditFailed = signal(false);

  readonly isSaving = signal(false);
  readonly userToDelete = signal<SystemAccessUser | null>(null);
  readonly ruleToDelete = signal<SystemAccessDepartmentRule | null>(null);

  readonly userTrackFn: TrackByFunction<SystemAccessUser> = (_index, row) => row.id;
  readonly ruleTrackFn: TrackByFunction<SystemAccessDepartmentRule> = (_index, row) => row.id;
  readonly auditTrackFn: TrackByFunction<SystemAccessAuditLog> = (_index, row) => row.id;

  get activeTabConfig(): AccessTabConfig {
    return this.tabs.find(tab => tab.key === this.activeTab()) ?? this.tabs[0];
  }

  ngOnInit(): void {
    const initialTab = this.tabFromQueryParam(this.route.snapshot.queryParamMap.get('tab'));
    if (this.route.snapshot.queryParamMap.get('tab') !== initialTab) {
      this.updateUrlTab(initialTab, true);
    }

    this.route.queryParamMap.subscribe(params => {
      const tab = this.tabFromQueryParam(params.get('tab'));
      if (tab !== this.activeTab()) {
        this.activeTab.set(tab);
        this.resetTabState(tab);
      }
      this.loadActiveTab();
    });
  }

  setTab(tab: AccessTab): void {
    if (tab === this.activeTab()) return;
    this.updateUrlTab(tab);
  }

  private tabFromQueryParam(value: string | null): AccessTab {
    return this.tabs.find(tab => tab.key === value)?.key ?? 'users';
  }

  private updateUrlTab(tab: AccessTab, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  private resetTabState(tab: AccessTab): void {
    if (tab === 'users') {
      this.userPage.set(1);
    } else if (tab === 'departments') {
      this.rulePage.set(1);
    } else {
      this.auditPage.set(1);
    }
  }

  openCreateDialog(): void {
    if (this.activeTab() === 'users') {
      this.openCreateUser();
    } else if (this.activeTab() === 'departments') {
      this.openCreateRule();
    }
  }

  loadActiveTab(): void {
    if (this.activeTab() === 'users') {
      this.loadUsers();
    } else if (this.activeTab() === 'departments') {
      this.loadDepartmentRules();
    } else {
      this.loadAuditLogs();
    }
  }

  activeColumns(): readonly DataTableColumn[] {
    return this.activeTabConfig.columns;
  }

  rowNumber(index: number, page: number, pageSize: number): number {
    return (page - 1) * pageSize + index + 1;
  }

  accessBadgeClass(value: AccessType): string {
    return value === 'ALLOW' ? 'status-badge' : 'status-badge status-badge--inactive';
  }

  decisionBadgeClass(value: string): string {
    return value === 'ALLOWED' ? 'status-badge' : 'status-badge status-badge--inactive';
  }

  loadUsers(): void {
    this.usersLoading.set(true);
    this.usersFailed.set(false);
    this.systemAccessService
      .listUsers({
        page: this.userPage(),
        perPage: this.userPageSize(),
        search: this.userSearch(),
        status: this.userStatus(),
        accessType: this.userAccessType(),
      })
      .pipe(finalize(() => this.usersLoading.set(false)))
      .subscribe({
        next: response => {
          this.users.set(response.data.items);
          this.userTotalItems.set(response.data.pagination.total_items);
          this.userTotalPages.set(Math.max(1, response.data.pagination.total_pages));
        },
        error: () => {
          this.users.set([]);
          this.usersFailed.set(true);
        },
      });
  }

  loadDepartmentRules(): void {
    this.rulesLoading.set(true);
    this.rulesFailed.set(false);
    this.systemAccessService
      .listDepartmentRules({
        page: this.rulePage(),
        perPage: this.rulePageSize(),
        search: this.ruleSearch(),
        status: this.ruleStatus(),
        matchType: this.ruleMatchType(),
      })
      .pipe(finalize(() => this.rulesLoading.set(false)))
      .subscribe({
        next: response => {
          this.departmentRules.set(response.data.items);
          this.ruleTotalItems.set(response.data.pagination.total_items);
          this.ruleTotalPages.set(Math.max(1, response.data.pagination.total_pages));
        },
        error: () => {
          this.departmentRules.set([]);
          this.rulesFailed.set(true);
        },
      });
  }

  loadAuditLogs(): void {
    this.auditLoading.set(true);
    this.auditFailed.set(false);
    this.systemAccessService
      .listAuditLogs({
        page: this.auditPage(),
        perPage: this.auditPageSize(),
        search: this.auditSearch(),
        decision: this.auditDecision(),
        matchedRuleType: this.auditRuleType(),
      })
      .pipe(finalize(() => this.auditLoading.set(false)))
      .subscribe({
        next: response => {
          this.auditLogs.set(response.data.items);
          this.auditTotalItems.set(response.data.pagination.total_items);
          this.auditTotalPages.set(Math.max(1, response.data.pagination.total_pages));
        },
        error: () => {
          this.auditLogs.set([]);
          this.auditFailed.set(true);
        },
      });
  }

  resetUserFilters(): void {
    this.userSearch.set('');
    this.userStatus.set('');
    this.userAccessType.set('');
    this.userPage.set(1);
    this.loadUsers();
  }

  resetRuleFilters(): void {
    this.ruleSearch.set('');
    this.ruleStatus.set('');
    this.ruleMatchType.set('');
    this.rulePage.set(1);
    this.loadDepartmentRules();
  }

  resetAuditFilters(): void {
    this.auditSearch.set('');
    this.auditDecision.set('');
    this.auditRuleType.set('');
    this.auditPage.set(1);
    this.loadAuditLogs();
  }

  openCreateUser(): void {
    this.selectedUser.set(null);
    this.userUsername.set('');
    this.userType.set('ALLOW');
    this.userReason.set('');
    this.userActive.set(true);
    this.userDialogMode.set('create');
    this.loadStaffOptions();
  }

  openEditUser(user: SystemAccessUser): void {
    this.selectedUser.set(user);
    this.userUsername.set(user.username);
    this.userType.set(user.access_type);
    this.userReason.set(user.reason || '');
    this.userActive.set(user.is_active);
    this.userDialogMode.set('edit');
    this.loadStaffOptions('', user.username);
  }

  saveUser(): void {
    const mode = this.userDialogMode();
    const username = this.userUsername().trim();
    if (!mode || !username || this.isSaving()) return;

    const payload: SystemAccessUserPayload = {
      username,
      access_type: this.userType(),
      reason: this.userReason().trim() || null,
      is_active: this.userActive(),
    };

    const request = mode === 'create'
      ? this.systemAccessService.createUser(payload)
      : this.systemAccessService.updateUser(this.selectedUser()!.id, payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: response => {
        this.toastService.success(response.message);
        this.userDialogMode.set(null);
        this.loadUsers();
      },
    });
  }

  openCreateRule(): void {
    this.selectedRule.set(null);
    this.ruleName.set('');
    this.ruleType.set('EXACT');
    this.departmentValue.set('');
    this.ruleActive.set(true);
    this.ruleDialogMode.set('create');
  }

  openEditRule(rule: SystemAccessDepartmentRule): void {
    this.selectedRule.set(rule);
    this.ruleName.set(rule.rule_name);
    this.ruleType.set(rule.match_type);
    this.departmentValue.set(rule.department_value);
    this.ruleActive.set(rule.is_active);
    this.ruleDialogMode.set('edit');
  }

  saveRule(): void {
    const mode = this.ruleDialogMode();
    if (!mode || !this.ruleName().trim() || !this.departmentValue().trim() || this.isSaving()) return;

    const payload: SystemAccessDepartmentRulePayload = {
      rule_name: this.ruleName().trim(),
      match_type: this.ruleType(),
      department_value: this.departmentValue().trim(),
      is_active: this.ruleActive(),
    };
    const request = mode === 'create'
      ? this.systemAccessService.createDepartmentRule(payload)
      : this.systemAccessService.updateDepartmentRule(this.selectedRule()!.id, payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: response => {
        this.toastService.success(response.message);
        this.ruleDialogMode.set(null);
        this.loadDepartmentRules();
      },
    });
  }

  deleteUser(): void {
    const user = this.userToDelete();
    if (!user || this.isSaving()) return;
    this.isSaving.set(true);
    this.systemAccessService.deleteUser(user.id).pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: response => {
        this.toastService.success(response.message);
        this.userToDelete.set(null);
        this.loadUsers();
      },
    });
  }

  deleteRule(): void {
    const rule = this.ruleToDelete();
    if (!rule || this.isSaving()) return;
    this.isSaving.set(true);
    this.systemAccessService.deleteDepartmentRule(rule.id).pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: response => {
        this.toastService.success(response.message);
        this.ruleToDelete.set(null);
        this.loadDepartmentRules();
      },
    });
  }

  formatDate(value: string | null): string {
    return formatDisplayDate(value, 'Not set');
  }

  staffDropdownOptions(): DropdownOption<string>[] {
    const selectedUsername = this.userUsername().trim();
    const options = this.staffOptions().map((staff) => this.toStaffDropdownOption(staff));

    if (selectedUsername && !options.some((option) => option.value === selectedUsername)) {
      return [
        {
          value: selectedUsername,
          label: selectedUsername,
          description: 'Existing user rule',
          searchText: selectedUsername,
        },
        ...options,
      ];
    }

    return options;
  }

  loadStaffOptions(search = '', selectedUsername = this.userUsername().trim()): void {
    this.staffOptionsLoading.set(true);
    this.systemAccessService
      .listStaff(search)
      .pipe(finalize(() => this.staffOptionsLoading.set(false)))
      .subscribe({
        next: response => {
          this.staffOptions.set(response.data);
          if (selectedUsername) {
            this.userUsername.set(selectedUsername);
          }
        },
        error: () => {
          this.staffOptions.set([]);
        },
      });
  }

  private toStaffDropdownOption(staff: StaffOption): DropdownOption<string> {
    return {
      value: staff.username,
      label: staff.fullname || staff.username,
      description: [staff.username, staff.email || staff.staff_email, staff.department]
        .filter(Boolean)
        .join(' | '),
      searchText: [staff.username, staff.fullname, staff.email, staff.staff_email, staff.department, staff.job_title]
        .filter(Boolean)
        .join(' '),
    };
  }

}
