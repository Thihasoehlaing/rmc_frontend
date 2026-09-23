import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AddOptionModalComponent,
  AddOptionPayload,
} from '../../../shared/components/add-option-modal/add-option-modal.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { ToastService } from '../../../core/services/toast.service';
import { DropdownOption } from '../../../core/interfaces/components.interface';
import { CachedFormOption, FormCacheService } from '../../../core/services/form-cache.service';
import { AdminCatalogItem, AdminCatalogKind } from './catalog-api.types';
import { CountryApi, CountryService } from './country.service';
import { CurrencyApi, CurrencyService } from './currency.service';
import {
  ExternalGrantCategoryApi,
  ExternalGrantCategoryService,
} from './external-grant-category.service';
import { ProjectAccountCodeApi, ProjectAccountCodeService } from './project-account-code.service';
import { AdminSettingsPageHeaderComponent } from '../../../shared/components/admin-settings-page-header/admin-settings-page-header.component';
import { formatDisplayDate } from '../../../shared/utils/date-time.util';

@Component({
  selector: 'app-catalog-manager',
  standalone: true,
  imports: [
    AdminSettingsPageHeaderComponent,
    CommonModule,
    FormsModule,
    ActionButtonComponent,
    AddOptionModalComponent,
    DialogComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    SubmissionsSearchComponent,
    TableActionIconComponent,
  ],
  templateUrl: './catalog-manager.component.html',
  styleUrls: [
    '../dropdowns/shared/form-dropdown-options-manager.component.scss',
    './catalog-manager.component.scss',
  ],
})
export class CatalogManagerComponent implements OnInit {
  @Input({ required: true }) kind!: AdminCatalogKind;
  @Input({ required: true }) title = '';
  @Input({ required: true }) subtitle = '';
  @Input() allowAdd = true;
  @Input() showCode = false;
  @Input() showSharedWith = false;
  @Input() codeLabel = 'Code';
  @Input() nameLabel = 'Category Name';

  private readonly externalGrantCategories = inject(ExternalGrantCategoryService);
  private readonly projectAccountCodes = inject(ProjectAccountCodeService);
  private readonly countries = inject(CountryService);
  private readonly currencies = inject(CurrencyService);
  private readonly formCache = inject(FormCacheService);
  private readonly toast = inject(ToastService);

  private readonly fallbackForms: CachedFormOption[] = [
    { id: 0, form_code: 'CONFERENCE', form_name: 'Conference Application', is_active: true },
    { id: 0, form_code: 'JOURNAL', form_name: 'Journal Publication', is_active: true },
  ];
  readonly formOptionsData = signal<CachedFormOption[]>([]);
  readonly countryOptionsData = signal<CountryApi[]>([]);
  readonly availableFormNames = computed(() =>
    this.activeFormOptionsData().map((form) => form.form_name),
  );
  readonly availableFormSharingOptions = computed<DropdownOption<string>[]>(() =>
    this.activeFormOptionsData().map((form) => ({
      value: form.form_name,
      label: form.form_name,
      description: form.form_code,
      searchText: `${form.form_name} ${form.form_code}`,
    })),
  );
  readonly formFilterOptions: DropdownOption<string>[] = [
    { value: 'all', label: 'All' },
    { value: 'CONFERENCE', label: 'Conference Application' },
    { value: 'JOURNAL', label: 'Journal Publication' },
  ];
  readonly countryOptions = computed<DropdownOption<string>[]>(() =>
    this.countryOptionsData()
      .filter((country) => country.is_active)
      .map((country) => ({
        value: String(country.id),
        label: country.name,
        description: country.code,
        searchText: `${country.name} ${country.code}`,
      })),
  );
  readonly searchQuery = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly formFilter = signal<string>('all');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];
  readonly showModal = signal(false);
  readonly editingRow = signal<AdminCatalogItem | null>(null);
  readonly rowToDelete = signal<AdminCatalogItem | null>(null);
  readonly sharedFormsDialog = signal<{ itemName: string; forms: string[] } | null>(null);
  readonly apiRows = signal<AdminCatalogItem[]>([]);
  readonly apiTotalItems = signal(0);
  readonly apiTotalPages = signal(1);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly busyRowId = signal<number | null>(null);
  readonly loadFailed = signal(false);
  readonly modalInitial = computed<AddOptionPayload | null>(() => {
    const row = this.editingRow();
    return row
      ? {
          code: row.code,
          symbol: row.symbol,
          name: row.name,
          status: row.status,
          appliesTo: [...row.appliesTo],
          countryId: row.countryId ?? null,
        }
      : null;
  });

  readonly usesExternalGrantCategoryApi = computed(() => this.kind === 'external-grant-category');
  readonly usesProjectAccountCodeApi = computed(() => this.kind === 'project-account-code');
  readonly usesCountryApi = computed(() => this.kind === 'country');
  readonly usesCurrencyApi = computed(() => this.kind === 'currency');
  readonly filteredRows = computed(() => this.apiRows().filter((item) => item.kind === this.kind));

  readonly totalPages = this.apiTotalPages.asReadonly();
  readonly pagedRows = this.filteredRows;
  readonly totalItems = this.apiTotalItems.asReadonly();

  get searchPlaceholder(): string {
    if (this.usesCountryApi()) {
      return 'Search code or country name';
    }
    if (this.usesCurrencyApi()) {
      return 'Search currency code, currency name or country name';
    }
    return this.showCode ? 'Search code or description' : `Search ${this.nameLabel.toLowerCase()}`;
  }

  get tableColumnCount(): number {
    return (
      5 + (this.showCode ? 1 : 0) + (this.usesCurrencyApi() ? 2 : 0) + (this.showSharedWith ? 1 : 0)
    );
  }

  ngOnInit(): void {
    this.loadActiveForms();
    this.loadCountryOptions();
    this.loadCatalogItems();
  }

  openAddModal(): void {
    if (!this.allowAdd) return;
    this.editingRow.set(null);
    this.showModal.set(true);
  }

  editRow(row: AdminCatalogItem): void {
    this.editingRow.set(row);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRow.set(null);
  }

  saveModal(payload: AddOptionPayload): void {
    const row = this.editingRow();
    if (this.usesProjectAccountCodeApi()) {
      if (row) this.saveProjectAccountCode(row, payload);
      return;
    }
    if (this.usesExternalGrantCategoryApi()) {
      this.saveExternalGrantCategory(row, payload);
      return;
    }
    if (this.usesCountryApi()) {
      this.saveCountry(row, payload);
      return;
    }
    if (this.usesCurrencyApi()) {
      this.saveCurrency(row, payload);
    }
  }

  toggleStatus(row: AdminCatalogItem): void {
    if (this.usesProjectAccountCodeApi()) {
      this.updateProjectAccountCodeStatus(row);
      return;
    }
    if (this.usesExternalGrantCategoryApi()) {
      this.busyRowId.set(row.id);
      this.externalGrantCategories
        .update(row.id, {
          is_active: row.status !== 'Active',
        })
        .subscribe({
          next: (response) => {
            if (!response.success) {
              this.busyRowId.set(null);
              this.toast.error(response.message || 'Unable to update the category status.');
              return;
            }
            this.toast.success(
              response.message ||
                `${row.name} ${row.status === 'Active' ? 'deactivated' : 'activated'}.`,
            );
            this.loadCatalogItems();
          },
          error: () => {
            this.busyRowId.set(null);
            this.toast.error('Unable to update the category status. Please try again.');
          },
        });
      return;
    }
    if (this.usesCountryApi()) {
      this.updateCountryStatus(row);
      return;
    }
    if (this.usesCurrencyApi()) {
      this.updateCurrencyStatus(row);
      return;
    }
  }

  openSharedForms(row: AdminCatalogItem): void {
    this.sharedFormsDialog.set({
      itemName: row.code ? `${row.code} - ${row.name}` : row.name,
      forms: [...row.appliesTo],
    });
  }

  confirmDelete(): void {
    const row = this.rowToDelete();
    if (!row) return;
    if (this.usesProjectAccountCodeApi()) {
      this.deleteProjectAccountCode(row);
      return;
    }
    if (this.usesExternalGrantCategoryApi()) {
      this.busyRowId.set(row.id);
      this.externalGrantCategories.delete(row.id).subscribe({
        next: (response) => {
          if (!response.success) {
            this.busyRowId.set(null);
            this.toast.error(response.message || 'Unable to delete the category.');
            return;
          }
          this.rowToDelete.set(null);
          this.toast.success(response.message || 'Option deleted.');
          if (this.pagedRows().length === 1 && this.page() > 1) {
            this.page.update((currentPage) => currentPage - 1);
          }
          this.loadCatalogItems();
        },
        error: () => {
          this.busyRowId.set(null);
          this.toast.error('Unable to delete the category. Please try again.');
        },
      });
      return;
    }
    if (this.usesCountryApi()) {
      this.deleteCountry(row);
      return;
    }
    if (this.usesCurrencyApi()) {
      this.deleteCurrency(row);
      return;
    }
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
    this.loadCatalogItems();
  }

  onReset(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.formFilter.set('all');
    this.page.set(1);
    this.loadCatalogItems();
  }

  onStatusChange(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadCatalogItems();
  }

  onFormFilterChange(formCode: string | null): void {
    this.formFilter.set(formCode || 'all');
    this.page.set(1);
    if (this.usesProjectAccountCodeApi()) {
      this.loadProjectAccountCodes();
    }
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadCatalogItems();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadCatalogItems();
  }

  formatDate(value: string): string {
    return formatDisplayDate(value);
  }

  displayName(row: AdminCatalogItem): string {
    if (!this.usesProjectAccountCodeApi() || row.name.length <= 100) {
      return row.name;
    }
    return `${row.name.slice(0, 100)}…`;
  }

  deleteDialogNote(): string {
    if (this.showSharedWith) {
      return 'This removes the option from every form where it is currently available.';
    }
    return 'This removes the option from future selections.';
  }

  private activeFormOptionsData(): CachedFormOption[] {
    const activeForms = this.formOptionsData().filter((form) => form.is_active !== false);
    return activeForms.length ? activeForms : this.fallbackForms;
  }

  private loadActiveForms(): void {
    if (!this.showSharedWith) return;

    this.formCache.getActiveForms().subscribe({
      next: (response) => this.formOptionsData.set(response.data ?? []),
      error: () => this.formOptionsData.set([]),
    });
  }

  private loadCountryOptions(): void {
    if (!this.usesCurrencyApi()) return;

    this.countries.options().subscribe({
      next: (response) => this.countryOptionsData.set(response.data ?? []),
      error: () => this.countryOptionsData.set([]),
    });
  }

  loadCatalogItems(): void {
    if (this.usesProjectAccountCodeApi()) {
      this.loadProjectAccountCodes();
      return;
    }
    if (this.usesCountryApi()) {
      this.loadCountries();
      return;
    }
    if (this.usesCurrencyApi()) {
      this.loadCurrencies();
      return;
    }
    this.loadExternalGrantCategories();
  }

  private loadExternalGrantCategories(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.externalGrantCategories
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        status: this.statusFilter(),
        search: this.searchQuery(),
      })
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.handleExternalCategoryLoadFailure(response.message);
            return;
          }
          const data = response.data;
          this.apiRows.set((data.items ?? []).map((item) => this.toCatalogItem(item)));
          this.apiTotalItems.set(data.pagination?.total_items ?? data.items?.length ?? 0);
          this.apiTotalPages.set(Math.max(1, data.pagination?.total_pages ?? 1));
          this.page.set(data.pagination?.current_page ?? this.page());
          this.isLoading.set(false);
          this.busyRowId.set(null);
        },
        error: () => this.handleExternalCategoryLoadFailure(),
      });
  }

  private saveExternalGrantCategory(row: AdminCatalogItem | null, payload: AddOptionPayload): void {
    if (this.isSaving()) return;

    const request = {
      code: row?.code ?? this.toExternalGrantCategoryCode(payload.name),
      name: payload.name.trim(),
      is_active: payload.status === 'Active',
    };
    this.isSaving.set(true);
    const operation = row
      ? this.externalGrantCategories.update(row.id, request)
      : this.externalGrantCategories.create(request);

    operation.subscribe({
      next: (response) => {
        if (!response.success) {
          this.isSaving.set(false);
          this.toast.error(response.message || `Unable to ${row ? 'update' : 'add'} the category.`);
          return;
        }
        this.isSaving.set(false);
        this.toast.success(response.message || (row ? 'Option updated.' : 'Option added.'));
        this.closeModal();
        this.loadCatalogItems();
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error(`Unable to ${row ? 'update' : 'add'} the category. Please try again.`);
      },
    });
  }

  private toCatalogItem(item: ExternalGrantCategoryApi): AdminCatalogItem {
    return {
      id: item.id,
      kind: 'external-grant-category',
      code: item.code,
      name: item.name,
      status: item.is_active ? 'Active' : 'Inactive',
      appliesTo: [],
      updatedAt: item.updated_at ?? item.created_at ?? '',
    };
  }

  private toExternalGrantCategoryCode(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private loadCountries(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.countries
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        status: this.statusFilter(),
        search: this.searchQuery(),
      })
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.handleCatalogLoadFailure(
              response.message,
              'Unable to load countries. Please try again.',
            );
            return;
          }
          const data = response.data;
          this.apiRows.set((data.items ?? []).map((item) => this.toCountryItem(item)));
          this.apiTotalItems.set(data.pagination?.total_items ?? data.items?.length ?? 0);
          this.apiTotalPages.set(Math.max(1, data.pagination?.total_pages ?? 1));
          this.page.set(data.pagination?.current_page ?? this.page());
          this.isLoading.set(false);
          this.busyRowId.set(null);
        },
        error: () =>
          this.handleCatalogLoadFailure(undefined, 'Unable to load countries. Please try again.'),
      });
  }

  private saveCountry(row: AdminCatalogItem | null, payload: AddOptionPayload): void {
    if (this.isSaving()) return;

    this.isSaving.set(true);
    const request = {
      name: payload.name.trim(),
      code: payload.code?.trim().toUpperCase() ?? '',
      is_active: payload.status === 'Active',
    };
    const operation = row ? this.countries.update(row.id, request) : this.countries.create(request);

    operation.subscribe({
      next: (response) => {
        if (!response.success) {
          this.isSaving.set(false);
          this.toast.error(response.message || `Unable to ${row ? 'update' : 'add'} the country.`);
          return;
        }
        this.isSaving.set(false);
        this.toast.success(response.message || (row ? 'Country updated.' : 'Country added.'));
        this.closeModal();
        this.loadCatalogItems();
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error(`Unable to ${row ? 'update' : 'add'} the country. Please try again.`);
      },
    });
  }

  private updateCountryStatus(row: AdminCatalogItem): void {
    this.busyRowId.set(row.id);
    this.countries.update(row.id, { is_active: row.status !== 'Active' }).subscribe({
      next: (response) => {
        if (!response.success) {
          this.busyRowId.set(null);
          this.toast.error(response.message || 'Unable to update the country status.');
          return;
        }
        this.toast.success(
          response.message ||
            `${row.name} ${row.status === 'Active' ? 'deactivated' : 'activated'}.`,
        );
        this.loadCatalogItems();
      },
      error: () => {
        this.busyRowId.set(null);
        this.toast.error('Unable to update the country status. Please try again.');
      },
    });
  }

  private deleteCountry(row: AdminCatalogItem): void {
    this.busyRowId.set(row.id);
    this.countries.delete(row.id).subscribe({
      next: (response) => {
        if (!response.success) {
          this.busyRowId.set(null);
          this.toast.error(response.message || 'Unable to delete the country.');
          return;
        }
        this.rowToDelete.set(null);
        this.toast.success(response.message || 'Country deleted.');
        if (this.pagedRows().length === 1 && this.page() > 1) {
          this.page.update((currentPage) => currentPage - 1);
        }
        this.loadCatalogItems();
      },
      error: () => {
        this.busyRowId.set(null);
        this.toast.error('Unable to delete the country. Please try again.');
      },
    });
  }

  private toCountryItem(item: CountryApi): AdminCatalogItem {
    return {
      id: item.id,
      kind: 'country',
      code: item.code,
      name: item.name,
      status: item.is_active ? 'Active' : 'Inactive',
      appliesTo: [],
      updatedAt: item.updated_at ?? item.created_at ?? '',
    };
  }

  private loadCurrencies(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.currencies
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        status: this.statusFilter(),
        search: this.searchQuery(),
      })
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.handleCatalogLoadFailure(
              response.message,
              'Unable to load currencies. Please try again.',
            );
            return;
          }
          const data = response.data;
          this.apiRows.set((data.items ?? []).map((item) => this.toCurrencyItem(item)));
          this.apiTotalItems.set(data.pagination?.total_items ?? data.items?.length ?? 0);
          this.apiTotalPages.set(Math.max(1, data.pagination?.total_pages ?? 1));
          this.page.set(data.pagination?.current_page ?? this.page());
          this.isLoading.set(false);
          this.busyRowId.set(null);
        },
        error: () =>
          this.handleCatalogLoadFailure(undefined, 'Unable to load currencies. Please try again.'),
      });
  }

  private saveCurrency(row: AdminCatalogItem | null, payload: AddOptionPayload): void {
    if (this.isSaving()) return;

    this.isSaving.set(true);
    const request = {
      name: payload.name.trim(),
      symbol: payload.symbol?.trim() ?? '',
      code: payload.code?.trim().toUpperCase() ?? '',
      country_id: payload.countryId ?? 0,
      is_active: payload.status === 'Active',
    };
    const operation = row
      ? this.currencies.update(row.id, request)
      : this.currencies.create(request);

    operation.subscribe({
      next: (response) => {
        if (!response.success) {
          this.isSaving.set(false);
          this.toast.error(response.message || `Unable to ${row ? 'update' : 'add'} the currency.`);
          return;
        }
        this.isSaving.set(false);
        this.toast.success(response.message || (row ? 'Currency updated.' : 'Currency added.'));
        this.closeModal();
        this.loadCatalogItems();
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error(`Unable to ${row ? 'update' : 'add'} the currency. Please try again.`);
      },
    });
  }

  private updateCurrencyStatus(row: AdminCatalogItem): void {
    this.busyRowId.set(row.id);
    this.currencies.update(row.id, { is_active: row.status !== 'Active' }).subscribe({
      next: (response) => {
        if (!response.success) {
          this.busyRowId.set(null);
          this.toast.error(response.message || 'Unable to update the currency status.');
          return;
        }
        this.toast.success(
          response.message ||
            `${row.name} ${row.status === 'Active' ? 'deactivated' : 'activated'}.`,
        );
        this.loadCatalogItems();
      },
      error: () => {
        this.busyRowId.set(null);
        this.toast.error('Unable to update the currency status. Please try again.');
      },
    });
  }

  private deleteCurrency(row: AdminCatalogItem): void {
    this.busyRowId.set(row.id);
    this.currencies.delete(row.id).subscribe({
      next: (response) => {
        if (!response.success) {
          this.busyRowId.set(null);
          this.toast.error(response.message || 'Unable to delete the currency.');
          return;
        }
        this.rowToDelete.set(null);
        this.toast.success(response.message || 'Currency deleted.');
        if (this.pagedRows().length === 1 && this.page() > 1) {
          this.page.update((currentPage) => currentPage - 1);
        }
        this.loadCatalogItems();
      },
      error: () => {
        this.busyRowId.set(null);
        this.toast.error('Unable to delete the currency. Please try again.');
      },
    });
  }

  private toCurrencyItem(item: CurrencyApi): AdminCatalogItem {
    return {
      id: item.id,
      kind: 'currency',
      code: item.code,
      symbol: item.symbol,
      name: item.name,
      status: item.is_active ? 'Active' : 'Inactive',
      appliesTo: [],
      updatedAt: item.updated_at ?? item.created_at ?? '',
      countryId: item.country_id,
      countryName: item.country_name,
    };
  }

  private loadProjectAccountCodes(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.projectAccountCodes
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        status: this.statusFilter(),
        search: this.searchQuery(),
        formCode: this.formFilter() === 'all' ? undefined : this.formFilter(),
      })
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.handleCatalogLoadFailure(
              response.message,
              'Unable to load project account codes. Please try again.',
            );
            return;
          }
          const data = response.data;
          this.apiRows.set((data.items ?? []).map((item) => this.toProjectAccountCodeItem(item)));
          this.apiTotalItems.set(data.pagination?.total_items ?? data.items?.length ?? 0);
          this.apiTotalPages.set(Math.max(1, data.pagination?.total_pages ?? 1));
          this.page.set(data.pagination?.current_page ?? this.page());
          this.isLoading.set(false);
          this.busyRowId.set(null);
        },
        error: () =>
          this.handleCatalogLoadFailure(
            undefined,
            'Unable to load project account codes. Please try again.',
          ),
      });
  }

  private saveProjectAccountCode(row: AdminCatalogItem, payload: AddOptionPayload): void {
    if (this.isSaving()) return;

    this.isSaving.set(true);
    this.projectAccountCodes
      .update(row.id, {
        code: payload.code?.trim() ?? '',
        description: payload.name.trim(),
        is_active: payload.status === 'Active',
        form_codes: payload.appliesTo.map((form) => this.toFormCode(form)),
      })
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.isSaving.set(false);
            this.toast.error(response.message || 'Unable to update the project account code.');
            return;
          }
          this.isSaving.set(false);
          this.toast.success(response.message || 'Project account code updated.');
          this.closeModal();
          this.loadCatalogItems();
        },
        error: () => {
          this.isSaving.set(false);
          this.toast.error('Unable to update the project account code. Please try again.');
        },
      });
  }

  private updateProjectAccountCodeStatus(row: AdminCatalogItem): void {
    this.busyRowId.set(row.id);
    this.projectAccountCodes.update(row.id, { is_active: row.status !== 'Active' }).subscribe({
      next: (response) => {
        if (!response.success) {
          this.busyRowId.set(null);
          this.toast.error(response.message || 'Unable to update the project account code.');
          return;
        }
        this.toast.success(
          response.message ||
            `${row.code} ${row.status === 'Active' ? 'deactivated' : 'activated'}.`,
        );
        this.loadCatalogItems();
      },
      error: () => {
        this.busyRowId.set(null);
        this.toast.error('Unable to update the project account code. Please try again.');
      },
    });
  }

  private deleteProjectAccountCode(row: AdminCatalogItem): void {
    this.busyRowId.set(row.id);
    this.projectAccountCodes.delete(row.id).subscribe({
      next: (response) => {
        if (!response.success) {
          this.busyRowId.set(null);
          this.toast.error(response.message || 'Unable to delete the project account code.');
          return;
        }
        this.rowToDelete.set(null);
        this.toast.success(response.message || 'Project account code deleted.');
        if (this.pagedRows().length === 1 && this.page() > 1) {
          this.page.update((currentPage) => currentPage - 1);
        }
        this.loadCatalogItems();
      },
      error: () => {
        this.busyRowId.set(null);
        this.toast.error('Unable to delete the project account code. Please try again.');
      },
    });
  }

  private toProjectAccountCodeItem(item: ProjectAccountCodeApi): AdminCatalogItem {
    return {
      id: item.id,
      kind: 'project-account-code',
      code: item.code,
      name: item.description ?? '',
      status: item.is_active ? 'Active' : 'Inactive',
      appliesTo: (item.form_codes ?? []).map((formCode) => this.toFormName(formCode)),
      updatedAt: item.updated_at ?? item.created_at ?? '',
    };
  }

  private toFormCode(formName: string): string {
    const formCodes: Record<string, string> = {
      'Conference Application': 'CONFERENCE',
      'Journal Publication': 'JOURNAL',
    };
    return formCodes[formName] ?? formName;
  }

  private toFormName(formCode: string): string {
    const normalized = formCode.toUpperCase();
    if (normalized === 'CONFERENCE') return 'Conference Application';
    if (normalized === 'JOURNAL') return 'Journal Publication';
    return formCode;
  }

  private handleExternalCategoryLoadFailure(message?: string): void {
    this.handleCatalogLoadFailure(
      message,
      'Unable to load external grant categories. Please try again.',
    );
  }

  private handleCatalogLoadFailure(message: string | undefined, fallback: string): void {
    this.apiRows.set([]);
    this.apiTotalItems.set(0);
    this.apiTotalPages.set(1);
    this.isLoading.set(false);
    this.busyRowId.set(null);
    this.loadFailed.set(true);
    this.toast.error(message || fallback);
  }
}
