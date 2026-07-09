import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ToastService } from '../../../core/services/toast.service';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import {
  AccessStatus,
  AccessType,
  DecisionFilter,
  MatchType,
  SystemAccessAuditLog,
  SystemAccessDepartmentRule,
  SystemAccessDepartmentRulePayload,
  SystemAccessService,
  SystemAccessUser,
  SystemAccessUserPayload,
} from './system-access.service';

type AccessTab = 'users' | 'departments' | 'audit';
type UserDialogMode = 'create' | 'edit';
type RuleDialogMode = 'create' | 'edit';

@Component({
  selector: 'app-system-access',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent, PaginationComponent],
  templateUrl: './system-access.component.html',
  styleUrls: ['../forms/forms.component.scss', './system-access.component.scss'],
})
export class SystemAccessComponent implements OnInit {
  private readonly systemAccessService = inject(SystemAccessService);
  private readonly toastService = inject(ToastService);

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
  readonly userExpiresAt = signal('');
  readonly userActive = signal(true);

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

  ngOnInit(): void {
    this.loadUsers();
    this.loadDepartmentRules();
    this.loadAuditLogs();
  }

  setTab(tab: AccessTab): void {
    this.activeTab.set(tab);
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
    this.userExpiresAt.set('');
    this.userActive.set(true);
    this.userDialogMode.set('create');
  }

  openEditUser(user: SystemAccessUser): void {
    this.selectedUser.set(user);
    this.userUsername.set(user.username);
    this.userType.set(user.access_type);
    this.userReason.set(user.reason || '');
    this.userExpiresAt.set(this.inputDateTime(user.expires_at));
    this.userActive.set(user.is_active);
    this.userDialogMode.set('edit');
  }

  saveUser(): void {
    const mode = this.userDialogMode();
    const username = this.normalizeUsername(this.userUsername());
    if (!mode || !username || this.isSaving()) return;

    const payload: SystemAccessUserPayload = {
      username,
      access_type: this.userType(),
      reason: this.userReason().trim() || null,
      expires_at: this.userExpiresAt() || null,
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
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  normalizeUsername(value: string): string {
    return value.trim().split('@')[0].toLowerCase();
  }

  private inputDateTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
