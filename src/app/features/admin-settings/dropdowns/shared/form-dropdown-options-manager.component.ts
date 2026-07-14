import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import {
  AddOptionModalComponent,
  AddOptionPayload,
} from '../../../../shared/components/add-option-modal/add-option-modal.component';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SubmissionsSearchComponent } from '../../../../shared/components/submissions-search/submissions-search.component';
import { SvgIconComponent } from '../../../../shared/components/svg-icon/svg-icon.component';
import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';
import { DropdownOption as SelectOption } from '../../../../core/interfaces/components.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { SVG_ICON_TRASH } from '../../../../shared/icons/svg-icons';
import {
  AccountCodeRow,
  DropdownOptionRow,
  FinanceOptionRow,
  ApiResponse,
  Pagination,
  RegionRow,
  SharedDropdownOptionsService,
} from './shared-dropdown-options.service';

export type FormDropdownTabSource =
  | 'dropdown'
  | 'region'
  | 'project-account-code'
  | 'vote-number'
  | 'account-code'
  | 'empty';

export interface FormDropdownTab {
  key: string;
  label: string;
  source?: FormDropdownTabSource;
  categoryCode?: string;
  formCode?: string;
  icon: string;
  codeLabel?: string;
  nameLabel?: string;
}

interface ViewRow {
  id: number;
  categoryId?: number;
  code?: string;
  name: string;
  status: 'Active' | 'Inactive';
  sharedWith: string[];
  sharedFormCodes: string[];
  percentage?: number | null;
  limitAmount?: number | null;
  description?: string | null;
  updatedAt?: string | null;
}

@Component({
  selector: 'app-form-dropdown-options-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ActionButtonComponent,
    AddOptionModalComponent,
    DialogComponent,
    PaginationComponent,
    SubmissionsSearchComponent,
    SvgIconComponent,
    TableActionIconComponent,
  ],
  templateUrl: './form-dropdown-options-manager.component.html',
  styleUrls: ['./form-dropdown-options-manager.component.scss'],
})
export class FormDropdownOptionsManagerComponent implements OnInit {
  @Input({ required: true }) title = '';
  @Input({ required: true }) subtitle = '';
  @Input({ required: true }) tabs: FormDropdownTab[] = [];
  @Input({ required: true }) formCodes: string[] = [];
  @Input() defaultTab = '';

  readonly trashIcon = SVG_ICON_TRASH;

  private readonly service = inject(SharedDropdownOptionsService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  rows = signal<ViewRow[]>([]);
  formOptions = signal<SelectOption<string>[]>([]);
  selectedTabKey = signal('');
  searchQuery = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  page = signal(1);
  pageSize = signal(10);
  pageSizeOptions = [10, 15, 30, 50];
  pagination = signal<Pagination | null>(null);
  private formOptionsLoaded = false;
  private initialLoadDone = false;
  loading = signal(true);
  showModal = signal(false);
  editingRow = signal<ViewRow | null>(null);
  rowToDelete = signal<ViewRow | null>(null);
  sharedFormsDialog = signal<{ itemName: string; forms: string[] } | null>(null);
  readonly skeletonColumns = [
    { width: '64px' },
    { width: '28%' },
    { width: '24%' },
    { width: '120px' },
    { width: '180px' },
    { width: '140px' },
  ];

  selectedTab = computed(() =>
    this.tabs.find((tab) => tab.key === this.selectedTabKey()) ?? this.tabs[0],
  );

  totalPages = computed(() => Math.max(1, this.pagination()?.total_pages ?? 1));
  totalItems = computed(() => this.pagination()?.total_items ?? this.rows().length);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const requestedTab = String(params['tab'] ?? this.defaultTab ?? this.tabs[0]?.key ?? '');
      const nextTab = this.tabs.some((tab) => tab.key === requestedTab)
        ? requestedTab
        : this.tabs[0]?.key ?? '';

      if (nextTab && params['tab'] !== nextTab) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { tab: nextTab },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }

      this.selectedTabKey.set(nextTab);
      this.searchQuery.set('');
      this.statusFilter.set('all');
      this.page.set(1);
      this.ensureSupportingDataForTab(this.selectedTab());
      this.loadRows();
    });
  }

  selectTab(tab: FormDropdownTab): void {
    if (this.loading()) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab.key },
      queryParamsHandling: 'merge',
    });
  }

  goBack(): void {
    this.router.navigate(['/admin-settings/dropdowns']);
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
    this.loadRows();
  }

  onReset(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.page.set(1);
    this.loadRows();
  }

  onStatusChange(value: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.loadRows();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadRows();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadRows();
  }

  openAddModal(): void {
    if (this.isEmptyTab()) {
      return;
    }

    this.ensureSupportingDataForTab(this.selectedTab());
    this.editingRow.set(null);
    this.showModal.set(true);
  }

  editRow(row: ViewRow): void {
    this.ensureSupportingDataForTab(this.selectedTab());
    this.editingRow.set(row);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRow.set(null);
  }

  modalInitial(): AddOptionPayload | null {
    const row = this.editingRow();
    if (!row) {
      return null;
    }

    return {
      code: row.code,
      name: row.name,
      status: row.status,
      appliesTo: row.sharedFormCodes,
      parentDomainId: row.categoryId ?? null,
      percentage: row.percentage ?? null,
      limit: row.limitAmount ?? null,
      description: row.description ?? '',
    };
  }

  saveModal(payload: AddOptionPayload): void {
    const row = this.editingRow();
    const tab = this.selectedTab();

    if (this.getTabSource(tab) === 'dropdown' && !tab.categoryCode) {
      this.toast.error('Dropdown category code is not available.');
      return;
    }

    const request$ = this.createSaveRequest(tab, payload, row);

    request$.subscribe({
      next: (res) => {
        if (res.success === false) {
          this.toast.error(res.message || 'Dropdown option save failed.');
          return;
        }
        this.toast.success(row ? 'Dropdown option updated.' : 'Dropdown option created.');
        this.closeModal();
        this.loadRows();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Dropdown option save failed.'),
    });
  }

  toggleStatus(row: ViewRow): void {
    const isActive = row.status === 'Inactive';
    const nextStatus = isActive ? 'ACTIVE' : 'INACTIVE';
    const request$ = this.createStatusRequest(row, nextStatus, isActive);

    request$.subscribe({
      next: () => this.loadRows(),
      error: (err) => this.toast.error(err?.error?.message || 'Status update failed.'),
    });
  }

  openDeleteDialog(row: ViewRow): void {
    this.rowToDelete.set(row);
  }

  openSharedForms(row: ViewRow): void {
    this.sharedFormsDialog.set({ itemName: row.name, forms: [...row.sharedWith] });
  }

  closeDeleteDialog(): void {
    this.rowToDelete.set(null);
  }

  confirmDelete(): void {
    const row = this.rowToDelete();
    if (!row) {
      return;
    }

    const request$ = this.createDeleteRequest(row.id);

    request$.subscribe({
      next: () => {
        this.toast.success('Dropdown option deleted.');
        this.closeDeleteDialog();
        this.loadRows();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Delete failed.'),
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    let hour = date.getHours();
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    const minute = `${date.getMinutes()}`.padStart(2, '0');
    const second = `${date.getSeconds()}`.padStart(2, '0');
    return `${year}-${month}-${day} ${`${hour}`.padStart(2, '0')}:${minute}:${second} ${suffix}`;
  }

  showCodeColumn(): boolean {
    return this.isFinanceTab() || this.getTabSource() === 'account-code';
  }

  showSharedColumn(): boolean {
    return this.getTabSource() === 'dropdown' || this.isFinanceTab();
  }

  showRegionColumns(): boolean {
    return this.getTabSource() === 'region';
  }

  showUpdatedColumn(): boolean {
    return this.getTabSource() !== 'region' && !this.isEmptyTab();
  }

  showCodeInput(): boolean {
    return this.isFinanceTab() || this.getTabSource() === 'account-code';
  }

  showRegionMetadata(): boolean {
    return this.getTabSource() === 'region';
  }

  allowsFormSharing(): boolean {
    return this.getTabSource() === 'dropdown' || this.isFinanceTab() || this.getTabSource() === 'account-code';
  }

  getCodeLabel(): string {
    return this.selectedTab()?.codeLabel ?? 'Code';
  }

  getNameLabel(): string {
    return this.selectedTab()?.nameLabel ?? (this.getTabSource() === 'region' ? 'Region Name' : 'Option Name');
  }

  getDefaultSelectedForms(): string[] {
    const tabFormCode = this.selectedTab()?.formCode;
    if ((this.isFinanceTab() || this.getTabSource() === 'account-code') && tabFormCode) {
      return [tabFormCode];
    }

    return this.formCodes;
  }

  private loadRows(): void {
    const tab = this.selectedTab();
    if (!tab) {
      return;
    }

    if (this.isEmptyTab(tab)) {
      const finish = () => {
        this.rows.set([]);
        this.pagination.set({
          current_page: this.page(),
          per_page: this.pageSize(),
          total_items: 0,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        });
        this.loading.set(false);
        this.initialLoadDone = true;
      };
      if (!this.initialLoadDone) {
        this.loading.set(true);
        setTimeout(finish, 600);
      } else {
        finish();
      }
      return;
    }

    this.loading.set(true);
    this.createListRequest(tab).subscribe({
      next: (res) => {
        this.rows.set((res.data?.items ?? []).map((row) => this.toViewRow(row)));
        this.pagination.set(res.data?.pagination ?? null);
        this.loading.set(false);
        this.initialLoadDone = true;
      },
      error: (err) => {
        this.loading.set(false);
        this.initialLoadDone = true;
        this.rows.set([]);
        this.toast.error(err?.error?.message || 'Failed to load dropdown options.');
      },
    });
  }

  private loadFormOptions(): void {
    if (this.formOptionsLoaded) {
      return;
    }

    this.formOptionsLoaded = true;
    const allowedCodes = new Set(this.formCodes.map((code) => code.toUpperCase()));
    this.service.listForms().subscribe({
      next: (res) => {
        this.formOptions.set(
          (res.data ?? [])
            .filter((form) => form.is_active && allowedCodes.has(form.form_code.toUpperCase()))
            .map((form) => ({
              label: form.form_name,
              value: form.form_code,
              description: form.form_code,
              searchText: `${form.form_name} ${form.form_code}`.toLowerCase(),
            })),
        );
      },
      error: () => {
        this.formOptionsLoaded = false;
        this.formOptions.set([]);
      },
    });
  }

  private createListRequest(
    tab: FormDropdownTab,
  ): Observable<ApiResponse<{ items: Array<DropdownOptionRow | RegionRow | FinanceOptionRow | AccountCodeRow>; pagination: Pagination }>> {
    const params = {
      category_code: tab.categoryCode,
      search: this.searchQuery(),
      status: this.statusFilter(),
      page: this.page(),
      per_page: this.pageSize(),
      form_code: tab.formCode,
    };

    switch (this.getTabSource(tab)) {
      case 'region':
        return this.service.listRegions(params);
      case 'project-account-code':
        return this.service.listProjectAccountCodes(params);
      case 'vote-number':
        return this.service.listVoteNumbers(params);
      case 'account-code':
        return this.service.listAccountCodes(params);
      default:
        return this.service.listOptions(params);
    }
  }

  private ensureSupportingDataForTab(tab: FormDropdownTab | undefined): void {
    const source = this.getTabSource(tab);
    if (source === 'dropdown') {
      this.loadFormOptions();
    } else if (source === 'project-account-code' || source === 'vote-number') {
      this.loadFormOptions();
    } else if (source === 'account-code') {
      this.loadFormOptions();
    }
  }

  private createSaveRequest(
    tab: FormDropdownTab,
    payload: AddOptionPayload,
    row: ViewRow | null,
  ): Observable<ApiResponse<DropdownOptionRow | RegionRow | FinanceOptionRow>> {
    const isActive = payload.status === 'Active';

    switch (this.getTabSource(tab)) {
      case 'empty':
        throw new Error('Empty dropdown tab does not support save.');
      case 'region': {
        const body = {
          region_name: payload.name.trim(),
          percentage: payload.percentage ?? null,
          limit_amount: payload.limit ?? null,
          description: payload.description ?? '',
          is_active: isActive,
        };
        return row ? this.service.updateRegion(row.id, body) : this.service.createRegion(body);
      }
      case 'project-account-code': {
        const body = {
          code: payload.code?.trim() ?? '',
          description: payload.name.trim(),
          is_active: isActive,
          form_codes: payload.appliesTo,
        };
        return row
          ? this.service.updateProjectAccountCode(row.id, body)
          : this.service.createProjectAccountCode(body);
      }
      case 'vote-number': {
        const body = {
          code: payload.code?.trim() ?? '',
          description: payload.name.trim(),
          is_active: isActive,
          form_codes: payload.appliesTo,
        };
        return row ? this.service.updateVoteNumber(row.id, body) : this.service.createVoteNumber(body);
      }
      case 'account-code': {
        const categoryId = payload.parentDomainId ?? row?.categoryId;
        const body = {
          code: payload.code?.trim() ?? '',
          description: payload.name.trim(),
          is_active: isActive,
          form_codes: payload.appliesTo,
          ...(categoryId ? { account_code_category_id: categoryId } : {}),
        };
        return row
          ? this.service.updateAccountCode(row.id, body)
          : this.service.createAccountCode({ location_type: 'BASE', ...body });
      }
      default: {
        const body = {
          option_name: payload.name.trim(),
          status: payload.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
          form_codes: payload.appliesTo,
        };

        return row
          ? this.service.updateOption(row.id, body)
          : this.service.createOption({
              category_code: tab.categoryCode ?? '',
              ...body,
            });
      }
    }
  }

  private createStatusRequest(
    row: ViewRow,
    nextDropdownStatus: 'ACTIVE' | 'INACTIVE',
    isActive: boolean,
  ): Observable<ApiResponse<DropdownOptionRow | RegionRow | FinanceOptionRow>> {
    switch (this.getTabSource()) {
      case 'empty':
        throw new Error('Empty dropdown tab does not support status update.');
      case 'region':
        return this.service.updateRegion(row.id, { is_active: isActive });
      case 'project-account-code':
        return this.service.updateProjectAccountCode(row.id, {
          is_active: isActive,
          form_codes: row.sharedFormCodes,
        });
      case 'vote-number':
        return this.service.updateVoteNumber(row.id, {
          is_active: isActive,
          form_codes: row.sharedFormCodes,
        });
      case 'account-code':
        return this.service.updateAccountCode(row.id, {
          is_active: isActive,
          form_codes: row.sharedFormCodes,
        });
      default:
        return this.service.updateOption(row.id, {
          status: nextDropdownStatus,
          form_codes: row.sharedFormCodes,
        });
    }
  }

  private createDeleteRequest(
    id: number,
  ): Observable<ApiResponse<DropdownOptionRow | RegionRow | FinanceOptionRow>> {
    switch (this.getTabSource()) {
      case 'empty':
        throw new Error('Empty dropdown tab does not support delete.');
      case 'region':
        return this.service.deleteRegion(id);
      case 'project-account-code':
        return this.service.deleteProjectAccountCode(id);
      case 'vote-number':
        return this.service.deleteVoteNumber(id);
      case 'account-code':
        return this.service.deleteAccountCode(id);
      default:
        return this.service.deleteOption(id);
    }
  }

  private toViewRow(row: DropdownOptionRow | RegionRow | FinanceOptionRow | AccountCodeRow): ViewRow {
    if (this.isRegionRow(row)) {
      return {
        id: row.id,
        name: row.region_name,
        status: row.is_active ? 'Active' : 'Inactive',
        sharedWith: [],
        sharedFormCodes: [],
        percentage: row.percentage == null ? null : Number(row.percentage),
        limitAmount: row.limit_amount == null ? null : Number(row.limit_amount),
        description: row.description ?? '',
      };
    }

    if (this.isFinanceRow(row)) {
      return {
        id: row.id,
        categoryId: this.isAccountCodeRow(row) ? row.account_code_category_id : undefined,
        code: row.code,
        name: row.description ?? '',
        status: row.is_active ? 'Active' : 'Inactive',
        sharedWith: this.formNamesForCodes(row.form_codes ?? []),
        sharedFormCodes: row.form_codes ?? [],
        updatedAt: row.updated_at,
      };
    }

    const sharedWith = row.shared_with ?? [];
    return {
      id: row.id,
      categoryId: row.dropdown_category_id,
      name: row.option_name ?? row.name ?? '',
      status: row.status?.toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
      sharedWith: sharedWith.map((form) => form.form_name),
      sharedFormCodes: sharedWith.map((form) => form.form_code),
      updatedAt: row.updated_at,
    };
  }

  private formNamesForCodes(codes: string[]): string[] {
    const formOptionByCode = new Map(this.formOptions().map((option) => [option.value, option.label]));
    return codes.map((code) => formOptionByCode.get(code) ?? code);
  }

  private getTabSource(tab: FormDropdownTab | undefined = this.selectedTab()): FormDropdownTabSource {
    return tab?.source ?? 'dropdown';
  }

  private isFinanceTab(): boolean {
    const source = this.getTabSource();
    return source === 'project-account-code' || source === 'vote-number';
  }

  isEmptyTab(tab: FormDropdownTab | undefined = this.selectedTab()): boolean {
    return this.getTabSource(tab) === 'empty';
  }

  private isRegionRow(row: DropdownOptionRow | RegionRow | FinanceOptionRow): row is RegionRow {
    return 'region_name' in row;
  }

  private isFinanceRow(row: DropdownOptionRow | RegionRow | FinanceOptionRow | AccountCodeRow): row is FinanceOptionRow | AccountCodeRow {
    return 'code' in row;
  }

  private isAccountCodeRow(row: DropdownOptionRow | RegionRow | FinanceOptionRow | AccountCodeRow): row is AccountCodeRow {
    return 'account_code_category_id' in row;
  }
}
