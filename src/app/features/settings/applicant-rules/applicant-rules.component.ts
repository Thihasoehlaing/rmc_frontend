import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, switchMap, tap } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DetailPanelSkeletonComponent } from '../../../shared/components/detail-panel-skeleton/detail-panel-skeleton.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  ApplicantRule,
  ApplicantRuleListParams,
  ApplicantRulePayload,
  ApplicantRulesService,
  DepartmentOption,
  FormOption,
  StaffOption,
} from './applicant-rules.service';

type DialogMode = 'create' | 'edit';
type StatusFilter = '' | 'Active' | 'Inactive';
type RuleTypeFilter = '' | 'DEPARTMENT' | 'STAFF';
type RuleType = 'DEPARTMENT' | 'STAFF';

const EMPTY_FILTERS: ApplicantRuleListParams = {
  page: 1,
  perPage: 10,
  ruleValue: '',
  formCode: null,
  ruleType: '',
  status: '',
};

@Component({
  selector: 'app-applicant-rules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    DetailPanelSkeletonComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './applicant-rules.component.html',
  styleUrls: ['../forms/forms.component.scss', './applicant-rules.component.scss'],
})
export class ApplicantRulesComponent implements OnInit {
  private readonly applicantRulesService = inject(ApplicantRulesService);
  private readonly toastService = inject(ToastService);

  readonly applicantRules = signal<ApplicantRule[]>([]);
  readonly forms = signal<FormOption[]>([]);
  readonly departments = signal<DepartmentOption[]>([]);
  readonly staffOptions = signal<StaffOption[]>([]);

  readonly ruleValueSearch = signal('');
  readonly selectedFormCode = signal<string | null>(null);
  readonly selectedRuleType = signal<RuleTypeFilter>('');
  readonly selectedStatus = signal<StatusFilter>('');
  readonly appliedFilters = signal<ApplicantRuleListParams>({ ...EMPTY_FILTERS });

  readonly page = signal(1);
  readonly pageSize = 10;
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly selectedRule = signal<ApplicantRule | null>(null);
  readonly formCode = signal<string | null>(null);
  readonly ruleType = signal<RuleType | ''>('');
  readonly ruleValue = signal('');
  readonly description = signal('');
  readonly ruleActive = signal(true);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly ruleToDelete = signal<ApplicantRule | null>(null);
  readonly ruleForDescription = signal<ApplicantRule | null>(null);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'form', label: 'Form', width: '190px' },
    { key: 'ruleType', label: 'Rule Type', width: '190px' },
    { key: 'ruleValue', label: 'Rule Value', width: '240px' },
    { key: 'description', label: 'Description', width: '130px', align: 'center' },
    { key: 'status', label: 'Status', width: '120px', align: 'center' },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index: number, row: unknown) =>
    (row as ApplicantRule).id;

  ngOnInit(): void {
    this.loadInitialData();
  }

  formOptions(): DropdownOption<string>[] {
    return this.forms().map((form) => ({
      value: form.form_code,
      label: form.form_code,
      description: form.form_name,
      searchText: `${form.form_code} ${form.form_name}`,
    }));
  }

  departmentOptions(): DropdownOption<string>[] {
    return this.departments().map((department) => ({
      value: department.department_name,
      label: department.department_name,
      description: department.department_type,
      searchText: `${department.department_name} ${department.department_type}`,
    }));
  }

  staffDropdownOptions(): DropdownOption<string>[] {
    return this.staffOptions()
      .filter((staff) => !!staff.username)
      .map((staff) => ({
        value: staff.username!,
        label: staff.fullname || staff.username!,
        description: [staff.username, staff.email, staff.staff_type, staff.department].filter(Boolean).join(' | '),
        searchText: [staff.username, staff.fullname, staff.email, staff.staff_type, staff.department]
          .filter(Boolean)
          .join(' '),
      }));
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    forkJoin({
      forms: this.applicantRulesService.listForms(),
      departments: this.applicantRulesService.listDepartments(),
      staffOptions: this.applicantRulesService.listStaffOptions(),
    })
      .pipe(
        tap(({ forms, departments, staffOptions }) => {
          this.forms.set(forms.data);
          this.departments.set(departments.data);
          this.staffOptions.set(staffOptions.data);
        }),
        switchMap(() => this.applicantRulesService.list(this.currentListParams())),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.applyListResponse(response.data.items, response.data.pagination);
          this.toastService.success(response.message);
        },
        error: () => this.handleLoadError(),
      });
  }

  loadApplicantRules(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.applicantRulesService
      .list(this.currentListParams())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadApplicantRules();
            return;
          }
          this.applyListResponse(response.data.items, pagination);
          this.toastService.success(response.message);
        },
        error: () => this.handleLoadError(),
      });
  }

  search(): void {
    this.appliedFilters.set({
      ...EMPTY_FILTERS,
      ruleValue: this.ruleValueSearch().trim(),
      formCode: this.selectedFormCode(),
      ruleType: this.selectedRuleType(),
      status: this.selectedStatus(),
    });
    this.page.set(1);
    this.loadApplicantRules();
  }

  resetFilters(): void {
    this.ruleValueSearch.set('');
    this.selectedFormCode.set(null);
    this.selectedRuleType.set('');
    this.selectedStatus.set('');
    this.appliedFilters.set({ ...EMPTY_FILTERS });
    this.page.set(1);
    this.loadApplicantRules();
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadApplicantRules();
  }

  openCreateDialog(): void {
    this.selectedRule.set(null);
    this.formCode.set(null);
    this.ruleType.set('');
    this.ruleValue.set('');
    this.description.set('');
    this.ruleActive.set(true);
    this.detailFailed.set(false);
    this.dialogMode.set('create');
  }

  openEditDialog(rule: ApplicantRule): void {
    this.selectedRule.set(rule);
    this.dialogMode.set('edit');
    this.fetchRule(rule.id);
  }

  retryDetail(): void {
    const rule = this.selectedRule();
    if (rule) this.fetchRule(rule.id);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.selectedRule.set(null);
    this.detailFailed.set(false);
  }

  saveRule(): void {
    const mode = this.dialogMode();
    const formCode = this.formCode();
    const ruleType = this.ruleType();
    const ruleValue = this.ruleValue().trim();

    if (!mode || !formCode || !ruleType || !ruleValue || this.isSaving()) return;

    const payload: ApplicantRulePayload = {
      form_code: formCode,
      rule_type: ruleType,
      rule_value: ruleValue,
      description: this.description().trim() || null,
      is_active: this.ruleActive(),
    };
    const request =
      mode === 'create'
        ? this.applicantRulesService.create(payload)
        : this.applicantRulesService.update(this.selectedRule()!.id, payload);

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialogMode.set(null);
        this.selectedRule.set(null);
        this.page.set(1);
        this.loadApplicantRules();
      },
    });
  }

  openDeleteDialog(rule: ApplicantRule): void {
    this.ruleToDelete.set(rule);
  }

  openDescriptionDialog(rule: ApplicantRule): void {
    this.ruleForDescription.set(rule);
  }

  closeDescriptionDialog(): void {
    this.ruleForDescription.set(null);
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.ruleToDelete.set(null);
  }

  confirmDelete(): void {
    const rule = this.ruleToDelete();
    if (!rule || this.isSaving()) return;

    this.isSaving.set(true);
    this.applicantRulesService
      .delete(rule.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.ruleToDelete.set(null);
          this.loadApplicantRules();
        },
      });
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create' ? 'Create Applicant Rule' : 'Edit Applicant Rule';
  }

  onRuleTypeChange(value: RuleType | ''): void {
    this.ruleType.set(value);
    this.ruleValue.set('');
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.applicantRules().length - 1, this.totalItems());
  }

  formatDate(value: string | null): string {
    if (!value) return 'Not updated';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not updated';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private currentListParams(): ApplicantRuleListParams {
    return {
      ...this.appliedFilters(),
      page: this.page(),
      perPage: this.pageSize,
    };
  }

  private fetchRule(id: number): void {
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.applicantRulesService
      .get(id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: (response) => {
          const rule = response.data;
          this.selectedRule.set(rule);
          this.formCode.set(rule.form_code);
          this.ruleType.set(this.toKnownRuleType(rule.rule_type));
          this.ruleValue.set(rule.rule_value);
          this.description.set(rule.description ?? '');
          this.ruleActive.set(rule.is_active);
          this.toastService.success(response.message);
        },
        error: () => this.detailFailed.set(true),
      });
  }

  private applyListResponse(
    rules: ApplicantRule[],
    pagination: { total_items: number; total_pages: number },
  ): void {
    this.applicantRules.set(rules);
    this.totalItems.set(pagination.total_items);
    this.totalPages.set(Math.max(1, pagination.total_pages));
  }

  private handleLoadError(): void {
    this.applicantRules.set([]);
    this.totalItems.set(0);
    this.totalPages.set(1);
    this.loadFailed.set(true);
  }

  private toKnownRuleType(value: string): RuleType | '' {
    return value === 'DEPARTMENT' || value === 'STAFF' ? value : '';
  }
}
