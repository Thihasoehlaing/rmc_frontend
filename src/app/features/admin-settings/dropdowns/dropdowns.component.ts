import { Component, TrackByFunction, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { AddOptionModalComponent, AddOptionPayload } from '../../../shared/components/add-option-modal/add-option-modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.component';

interface DropdownOption {
  id: number;
  formName: string;
  category: string;
  value: string;
  lastUpdated: string;
  createdBy: string;
  status: 'Active' | 'Inactive';
}

interface DropdownOptionView extends DropdownOption {
  sharedWith: string[];
  accountNumber?: string;
  percentage?: number;
  limit?: number;
  description?: string;
}

interface DropdownGroup {
  id: number;
  title: string;
  categories: string[];
  items: number;
  shared?: number;
}

type DropdownSortKey = 'value' | 'status' | 'lastUpdated';
type DropdownStatusFilter = 'all' | 'active' | 'inactive';

interface RegionMetadata {
  createdDate?: string;
  status?: 'Active' | 'Inactive';
  percentage?: number;
  limit?: number;
  description?: string;
}

interface AccountCodeMetadata {
  createdDate?: string;
  status?: 'Active' | 'Inactive';
  accountNumber?: string;
}

/**
 * Explicit sharing configuration: defines which forms can share which categories.
 * Only the forms listed for a category can share options in that category.
 */
interface CategorySharingConfig {
  [categoryName: string]: string[];
}

@Component({
  selector: 'app-dropdowns',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ActionButtonComponent, DataTableComponent, AddOptionModalComponent, PaginationComponent],
  templateUrl: './dropdowns.component.html',
  styleUrls: ['./dropdowns.component.scss'],
})
export class DropdownsComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly STORAGE_KEY = 'rmc_dropdowns_data';

  /**
   * Defines which forms are allowed to share options for each category.
   * Only forms listed here can have shared options across forms.
   * Categories not listed here are NOT shared across forms.
   */
  private readonly CATEGORY_SHARING_CONFIG: CategorySharingConfig = {
    'Research Cluster': ['RDIG Application', 'RA/GRA Application'],
    'Type of Organisation': ['RDIG Application', 'Conference Application', 'Journal Application'],
    'Project Account Code': ['Conference Application', 'Journal Application'],
  };

  private readonly DEFAULT_REGION_METADATA: Record<string, Required<Pick<RegionMetadata, 'percentage' | 'limit' | 'description'>>> = {
    americas: {
      percentage: 50,
      limit: 5000,
      description: 'USA, Canada, Mexico and other parts of South America - (A maximum of 50% & limit to a maximum of RM5,000, whichever is lower)',
    },
    asean: {
      percentage: 85,
      limit: 5000,
      description: 'ASEAN Countries - (A maximum of 85% & limit to a maximum of RM5,000, whichever is lower)',
    },
    asia: {
      percentage: 70,
      limit: 5000,
      description: 'Japan, China, Korea, Central Asia, India, Sri Lanka, Pakistan - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    },
    australasia: {
      percentage: 70,
      limit: 5000,
      description: 'Australia, New Zealand, PNG, Timor Leste - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    },
    europe: {
      percentage: 50,
      limit: 5000,
      description: 'Europe - (A maximum of 50% & limit to a maximum of RM5,000, whichever is lower)',
    },
    malaysia: {
      percentage: 85,
      limit: 5000,
      description: 'Throughout Malaysia - (A maximum of 85% & limit to a maximum of RM5,000, whichever is lower)',
    },
    'middle east and africa': {
      percentage: 60,
      limit: 5000,
      description: 'Middle East and Africa - (A maximum of 60% & limit to a maximum of RM5,000, whichever is lower)',
    },
    mea: {
      percentage: 60,
      limit: 5000,
      description: 'Middle East and Africa - (A maximum of 60% & limit to a maximum of RM5,000, whichever is lower)',
    },
    'pacific islands': {
      percentage: 70,
      limit: 5000,
      description: 'Pacific Islands (Maldives etc.) - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    },
    pacific: {
      percentage: 70,
      limit: 5000,
      description: 'Pacific Islands (Maldives etc.) - (A maximum of 70% & limit to a maximum of RM5,000, whichever is lower)',
    },
  };

  groups = signal<DropdownGroup[]>([
    { id: 1, title: 'RDIG Application', categories: ['Research Cluster', 'Type of Organisation', 'Research Domain', 'Sub-Research Domain', 'ESG', 'SDG'], items: 17, shared: 11 },
    { id: 2, title: 'RA/GRA Application', categories: ['Research Cluster', 'Programme Type', 'Supervisor Type', 'Funding Type'], items: 16, shared: 10 },
    { id: 3, title: 'Conference Application', categories: ['Select Region', 'Project Account Code', 'Select Item Description', 'Vote Number Description', 'Type of Organisation'], items: 18, shared: 9 },
    { id: 4, title: 'Journal Application', categories: ['Project Account Code', 'Vote Number Description', 'Account Code Description', 'Account Code', 'Type of Organisation'], items: 22, shared: 9 },
    { id: 5, title: 'Partnership Application', categories: ['Partnership Type', 'Partnership Category'], items: 2, shared: 0 },
  ]);

  dropdownOptions = signal<DropdownOption[]>([]);
  selectedGroupId = signal<number | null>(null);
  selectedCategory = signal<string>('');
  searchQuery = signal<string>('');
  statusFilter = signal<DropdownStatusFilter>('all');
  sortBy = signal<DropdownSortKey>('value');
  sortDirection = signal<'asc' | 'desc'>('asc');
  showAddModal = signal(false);
  editingOptionId = signal<number | null>(null);
  editingInitialPayload = signal<AddOptionPayload | null>(null);
  newOptionValue = signal<string>('');
  selectedOptionIds = signal<Set<number>>(new Set());
  deleteSelectionHint = signal(false);
  optionsPage = signal(1);
  optionsPageSize = signal(15);
  optionsPageSizeOptions = [5, 15, 30, 50];

  tableColumns = computed<DataTableColumn[]>(() => {
    const selectionColumn: DataTableColumn = { key: 'select', label: '', width: '56px', align: 'center' };

    if (this.isRegionMetadataCategory()) {
      return [
        selectionColumn,
        { key: 'value', label: 'Region Name', sortable: true },
        { key: 'percentage', label: 'Percentage' },
        { key: 'limit', label: 'Limit (RM)' },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'lastUpdated', label: 'Created Date', sortable: true },
        { key: 'actions', label: 'Actions' },
      ];
    }

    if (this.isAccountCodeMetadataCategory()) {
      const isVoteNumberDescription = this.isConferenceVoteNumberDescriptionCategory();
      return [
        selectionColumn,
        {
          key: 'value',
          label: isVoteNumberDescription ? 'Vote Number Description' : 'Option Name',
          sortable: true,
        },
        {
          key: 'accountNumber',
          label: isVoteNumberDescription ? 'Vote Number' : 'Account Number',
        },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'lastUpdated', label: 'Created Date', sortable: true },
        { key: 'actions', label: 'Actions' },
      ];
    }

    if (this.isConferenceVoteNumberDescriptionCategory()) {
      return [
        selectionColumn,
        { key: 'value', label: 'Vote Number Description', sortable: true },
        { key: 'sharedWith', label: 'Shared With' },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'lastUpdated', label: 'Created Date', sortable: true },
        { key: 'actions', label: 'Actions' },
      ];
    }

    return [
      selectionColumn,
      { key: 'value', label: 'Option Name', sortable: true },
      { key: 'sharedWith', label: 'Shared With' },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'lastUpdated', label: 'Created Date', sortable: true },
      { key: 'actions', label: 'Actions' },
    ];
  });

  trackById: TrackByFunction<DropdownGroup> = (i, g) => g.id;
  trackByOptionId: TrackByFunction<DropdownOption> = (i, o) => o.id;

  selectedGroup = computed(() => this.groups().find(g => g.id === this.selectedGroupId()) ?? null);
  selectedGroupCategories = computed(() => this.selectedGroup()?.categories ?? []);
  shareableForms = computed(() => {
    const category = this.selectedCategory();
    if (!category) {
      return [] as string[];
    }

    // If the category is in the sharing config, return only those forms
    if (this.CATEGORY_SHARING_CONFIG[category]) {
      return this.CATEGORY_SHARING_CONFIG[category].filter(form =>
        this.groups().some(g => g.title === form)
      );
    }

    // Otherwise, no sharing is allowed (return only current form)
    const group = this.selectedGroup();
    return group ? [group.title] : [];
  });

  defaultSelectedForms = computed(() => {
    const group = this.selectedGroup();
    return group ? [group.title] : [];
  });

  isRegionMetadataCategory(): boolean {
    return this.selectedGroup()?.title === 'Conference Application' &&
      this.selectedCategory() === 'Select Region';
  }

  isAccountCodeMetadataCategory(): boolean {
    const groupTitle = this.selectedGroup()?.title;
    const category = this.selectedCategory();
    return (groupTitle === 'Conference Application' && category === 'Select Item Description') ||
      (groupTitle === 'Journal Application' && category === 'Account Code') ||
      (['Conference Application', 'Journal Application'].includes(groupTitle ?? '') &&
        category === 'Vote Number Description');
  }

  private isAccountCodeMetadataOption(option: DropdownOption): boolean {
    return (option.formName === 'Conference Application' && option.category === 'Select Item Description') ||
      (option.formName === 'Journal Application' && option.category === 'Account Code') ||
      (['Conference Application', 'Journal Application'].includes(option.formName) &&
        option.category === 'Vote Number Description');
  }

  getAccountNumberMetadataLabel(): string {
    return this.isConferenceVoteNumberDescriptionCategory() ? 'Vote Number' : 'Account Number';
  }

  isConferenceVoteNumberDescriptionCategory(): boolean {
    return ['Conference Application', 'Journal Application'].includes(this.selectedGroup()?.title ?? '') &&
      this.selectedCategory() === 'Vote Number Description';
  }

  getCategoryDisplayLabel(category: string): string {
    if (this.selectedGroup()?.title !== 'Conference Application') {
      return category;
    }

    if (category === 'Select Region') {
      return 'Region';
    }

    if (category === 'Select Item Description') {
      return 'Account Code';
    }

    return category;
  }

  getOptionNameInputLabel(): string {
    return this.isConferenceVoteNumberDescriptionCategory()
      ? 'Vote Number Description'
      : 'Option Name';
  }

  // Computed list of categories with their counts for the currently selected group
  categoryCounts = computed(() => {
    const group = this.selectedGroup();
    if (!group) return [] as { name: string; count: number }[];
    const opts = this.dropdownOptions();
    return group.categories.map(cat => ({
      name: cat,
      count: opts.filter(o => o.formName === group.title && o.category === cat).length,
    }));
  });

  filteredOptions = computed<DropdownOptionView[]>(() => {
    // Only show options if a form AND category are explicitly selected
    if (!this.selectedGroupId() || !this.selectedCategory()) {
      return [];
    }

    let filtered = this.dropdownOptions();

    filtered = filtered.filter(o =>
      o.formName === this.selectedGroup()?.title &&
      o.category === this.selectedCategory()
    );

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(o => o.value.toLowerCase().includes(query));
    }

    const status = this.statusFilter();
    if (status !== 'all') {
      const target = status === 'active' ? 'Active' : 'Inactive';
      filtered = filtered.filter(o => o.status === target);
    }

    const sortKey = this.sortBy();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      return this.compareOptions(a, b, sortKey) * dir;
    });

    return filtered.map(option => {
      const regionMetadata = this.isRegionMetadataCategory()
        ? this.getRegionMetadata(option.value)
        : null;
      const accountCodeMetadata = this.isAccountCodeMetadataCategory()
        ? this.getAccountCodeMetadata(option.value, option.formName, option.category)
        : null;

      return {
        ...option,
        accountNumber: accountCodeMetadata?.accountNumber,
        percentage: regionMetadata?.percentage,
        limit: regionMetadata?.limit,
        description: regionMetadata?.description,
        sharedWith: this.isRegionMetadataCategory() || this.isAccountCodeMetadataCategory()
          ? []
          : this.getSharedWithForms(option),
      };
    });
  });

  paginatedOptions = computed(() => {
    const list = this.filteredOptions();
    const totalPages = this.optionsTotalPages();
    const currentPage = Math.min(this.optionsPage(), totalPages);
    const startIndex = (currentPage - 1) * this.optionsPageSize();
    return list.slice(startIndex, startIndex + this.optionsPageSize());
  });

  optionsTotalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredOptions().length / this.optionsPageSize()));
  });

  optionsPageStart = computed(() => {
    const total = this.filteredOptions().length;
    if (total === 0) return 0;
    return ((Math.min(this.optionsPage(), this.optionsTotalPages()) - 1) * this.optionsPageSize()) + 1;
  });

  optionsPageEnd = computed(() => {
    const total = this.filteredOptions().length;
    if (total === 0) return 0;
    return Math.min(this.optionsPageStart() + this.optionsPageSize() - 1, total);
  });

  selectedOptionsCount = computed(() => this.selectedOptionIds().size);

  isAllFilteredOptionsSelected = computed(() => {
    const optionIds = this.filteredOptions().map(option => option.id);
    return optionIds.length > 0 && optionIds.every(id => this.selectedOptionIds().has(id));
  });

  ngOnInit(): void {
    this.loadOptionsFromStorage();
    this.route.queryParams.subscribe(params => {
      const id = Number(params['group']);
      const explicitGroupId = !Number.isNaN(id) && id > 0 ? id : null;
      const isRdigRoute = this.route.snapshot.routeConfig?.path === 'rdig-dropdown-options';
      const rdigGroupId = this.groups().find(group => group.title === 'RDIG Application')?.id ?? null;
      this.selectedGroupId.set(explicitGroupId ?? (isRdigRoute ? rdigGroupId : null));
      this.selectedCategory.set('');
      this.searchQuery.set('');
      this.statusFilter.set('all');
    });
  }

  selectCategory(category: string) {
    if (!this.selectedGroupCategories().includes(category)) {
      return;
    }

    this.selectedCategory.set(category);
    // reset selected rows and status filter when switching categories
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.clearSelection();
    this.optionsPage.set(1);
  }

  onSearchQueryChange(value: string) {
    this.searchQuery.set(value);
    this.clearSelection();
    this.optionsPage.set(1);
  }

  onStatusFilterChange(value: DropdownStatusFilter) {
    this.statusFilter.set(value);
    this.clearSelection();
    this.optionsPage.set(1);
  }

  onOptionsPageChange(page: number) {
    this.optionsPage.set(page);
  }

  onOptionsPageSizeChange(pageSize: number) {
    this.optionsPageSize.set(pageSize);
    this.clearSelection();
    this.optionsPage.set(1);
  }

  isOptionSelected(id: number): boolean {
    return this.selectedOptionIds().has(id);
  }

  toggleOptionSelection(id: number, selected: boolean): void {
    this.selectedOptionIds.update(current => {
      const next = new Set(current);
      selected ? next.add(id) : next.delete(id);
      return next;
    });
  }

  toggleFilteredOptionsSelection(selected: boolean): void {
    const filteredIds = this.filteredOptions().map(option => option.id);
    if (selected) {
      this.selectedOptionIds.set(new Set(filteredIds));
      return;
    }

    this.selectedOptionIds.update(current => {
      const next = new Set(current);
      for (const id of filteredIds) {
        next.delete(id);
      }
      return next;
    });
  }

  clearSelection(): void {
    this.selectedOptionIds.set(new Set());
  }

  onDeleteSelectedClick(): void {
    if (this.isRegionMetadataCategory()) {
      return;
    }

    if (this.selectedOptionsCount() === 0) {
      this.showDeleteSelectionHint();
      return;
    }

    this.deleteSelectedOptions();
  }

  showDeleteSelectionHint(): void {
    if (this.selectedOptionsCount() > 0) {
      return;
    }

    this.deleteSelectionHint.set(true);
    window.setTimeout(() => this.deleteSelectionHint.set(false), 2200);
  }

  deleteSelectedOptions(): void {
    if (this.isRegionMetadataCategory()) {
      return;
    }

    const selectedIds = this.selectedOptionIds();
    if (selectedIds.size === 0) {
      this.showDeleteSelectionHint();
      return;
    }

    const selectedRows = this.dropdownOptions().filter(option => selectedIds.has(option.id));
    const count = selectedRows.length;
    const confirmed = window.confirm(`Delete ${count} selected option${count === 1 ? '' : 's'}?`);
    if (!confirmed) {
      return;
    }

    this.dropdownOptions.update(options => options.filter(option => !selectedIds.has(option.id)));

    for (const option of selectedRows) {
      this.deleteMetadataForOption(option);
    }

    this.clearSelection();
    this.saveOptionsToStorage();

    if (this.optionsPage() > this.optionsTotalPages()) {
      this.optionsPage.set(this.optionsTotalPages());
    }
  }

  private loadOptionsFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Partial<DropdownOption>[];
        this.dropdownOptions.set(data.map(item => ({
          id: item.id ?? 0,
          formName: item.formName ?? '',
          category: item.category ?? '',
          value: item.value ?? '',
          lastUpdated: this.normalizeDisplayDate(item.lastUpdated),
          createdBy: item.createdBy ?? 'Unknown',
          status: item.status === 'Inactive' ? 'Inactive' : 'Active',
        })));
      } else {
        this.dropdownOptions.set(
          this.getDefaultOptions().map(item => ({
            ...item,
            lastUpdated: this.normalizeDisplayDate(item.lastUpdated),
          }))
        );
      }

      this.seedDefaultRegionMetadata();
    } catch (error) {
      console.error('Failed to load dropdown options from localStorage:', error);
      this.dropdownOptions.set(this.getDefaultOptions());
      this.seedDefaultRegionMetadata();
    }
  }

  private saveOptionsToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.dropdownOptions()));
      window.dispatchEvent(new CustomEvent('rmc-dropdowns-updated'));
    } catch (error) {
      console.error('Failed to save dropdown options to localStorage:', error);
    }
  }

  private getDefaultOptions(): DropdownOption[] {
    return [
      { id: 1, formName: 'Conference Application', category: 'Select Region', value: 'Americas', lastUpdated: '15 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 2, formName: 'Conference Application', category: 'Select Region', value: 'ASEAN', lastUpdated: '15 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 3, formName: 'Conference Application', category: 'Select Region', value: 'Asia', lastUpdated: '15 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 4, formName: 'Conference Application', category: 'Select Region', value: 'Australasia', lastUpdated: '15 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 5, formName: 'Conference Application', category: 'Select Region', value: 'Europe', lastUpdated: '15 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 6, formName: 'Conference Application', category: 'Select Region', value: 'Malaysia', lastUpdated: '15 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 7, formName: 'Conference Application', category: 'Select Region', value: 'Middle East and Africa', lastUpdated: '15 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 8, formName: 'Conference Application', category: 'Select Region', value: 'Pacific Islands', lastUpdated: '15 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 9, formName: 'Conference Application', category: 'Select Item Description', value: 'Conference Fee', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 10, formName: 'Conference Application', category: 'Select Item Description', value: 'Travelling & Transportation', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 11, formName: 'Conference Application', category: 'Select Item Description', value: 'Airfare Local', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 12, formName: 'Conference Application', category: 'Select Item Description', value: 'Hotel & Lodging Local', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 13, formName: 'Conference Application', category: 'Select Item Description', value: 'Meals & Subsistence Local', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 14, formName: 'Conference Application', category: 'Select Item Description', value: 'Mileage Fares Parking Local', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 15, formName: 'Conference Application', category: 'Select Item Description', value: 'Staff Welfare and Refreshment', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 16, formName: 'Conference Application', category: 'Select Item Description', value: 'Telephone and Fax', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 17, formName: 'Conference Application', category: 'Select Item Description', value: 'Training Presentation Publication', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 18, formName: 'Conference Application', category: 'Type of Organisation', value: 'University', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 19, formName: 'Conference Application', category: 'Type of Organisation', value: 'Research Institute', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 20, formName: 'Conference Application', category: 'Type of Organisation', value: 'Company', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 21, formName: 'Conference Application', category: 'Type of Organisation', value: 'Government Agency', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 22, formName: 'Conference Application', category: 'Type of Organisation', value: 'Non-Profit Organization', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 23, formName: 'Conference Application', category: 'Type of Organisation', value: 'Other', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 24, formName: 'Conference Application', category: 'Staff Name', value: 'Vivian Banshee', lastUpdated: '22 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 25, formName: 'Conference Application', category: 'Staff Name', value: 'John Smith', lastUpdated: '22 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 26, formName: 'Conference Application', category: 'Staff Name', value: 'Sarah Johnson', lastUpdated: '22 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 27, formName: 'Conference Application', category: 'Staff Name', value: 'Michael Brown', lastUpdated: '22 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 28, formName: 'Conference Application', category: 'Staff Name', value: 'Emily Davis', lastUpdated: '22 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 29, formName: 'Conference Application', category: 'Staff Name', value: 'Robert Wilson', lastUpdated: '22 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 30, formName: 'Conference Application', category: 'Staff Name', value: 'Jessica Taylor', lastUpdated: '22 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 31, formName: 'Conference Application', category: 'Staff Name', value: 'James Anderson', lastUpdated: '22 Apr 2026', createdBy: 'Admin', status: 'Active' },
      // RDIG Application: copy Type of Organisation options from Conference (1-to-1)
      { id: 32, formName: 'RDIG Application', category: 'Type of Organisation', value: 'University', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 33, formName: 'RDIG Application', category: 'Type of Organisation', value: 'Research Institute', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 34, formName: 'RDIG Application', category: 'Type of Organisation', value: 'Company', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 35, formName: 'RDIG Application', category: 'Type of Organisation', value: 'Government Agency', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 36, formName: 'RDIG Application', category: 'Type of Organisation', value: 'Non-Profit Organization', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 37, formName: 'RDIG Application', category: 'Type of Organisation', value: 'Other', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 38, formName: 'Journal Application', category: 'Vote Number Description', value: 'VOTE NUMBER DESCRIPTION 01', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 39, formName: 'Journal Application', category: 'Vote Number Description', value: 'VOTE NUMBER DESCRIPTION 02', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 40, formName: 'Journal Application', category: 'Account Code', value: 'ACCOUNT CODE A', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 41, formName: 'Journal Application', category: 'Account Code', value: 'ACCOUNT CODE B', lastUpdated: '18 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 42, formName: 'Journal Application', category: 'Type of Organisation', value: 'University', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 43, formName: 'Journal Application', category: 'Type of Organisation', value: 'Research Institute', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 44, formName: 'Journal Application', category: 'Type of Organisation', value: 'Company', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 45, formName: 'Journal Application', category: 'Type of Organisation', value: 'Government Agency', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 46, formName: 'Journal Application', category: 'Type of Organisation', value: 'Non-Profit Organization', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 47, formName: 'Journal Application', category: 'Type of Organisation', value: 'Other', lastUpdated: '20 Apr 2026', createdBy: 'Admin', status: 'Active' },
      { id: 48, formName: 'Conference Application', category: 'Project Account Code', value: 'V29000', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 49, formName: 'Journal Application', category: 'Project Account Code', value: 'V29000', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 50, formName: 'Conference Application', category: 'Project Account Code', value: 'V29100', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 51, formName: 'Journal Application', category: 'Project Account Code', value: 'V29100', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 52, formName: 'Conference Application', category: 'Project Account Code', value: 'V29200', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 53, formName: 'Journal Application', category: 'Project Account Code', value: 'V29200', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 54, formName: 'Journal Application', category: 'Vote Number Description', value: 'Article Processing Charge', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 55, formName: 'Journal Application', category: 'Vote Number Description', value: 'Publication Fee', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 56, formName: 'Journal Application', category: 'Vote Number Description', value: 'Language Editing and Proofreading', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 57, formName: 'Journal Application', category: 'Account Code Description', value: 'Professional Services', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 58, formName: 'Journal Application', category: 'Account Code Description', value: 'Research Materials and Supplies', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
      { id: 59, formName: 'Journal Application', category: 'Account Code Description', value: 'Printing and Publication', lastUpdated: '18 Jun 2026', createdBy: 'Admin', status: 'Active' },
    ];
  }

  openGroup(g: DropdownGroup) {
    // If RDIG group is clicked, open the dedicated RDIG dropdown management page
    if (g.title.toLowerCase().includes('rdig')) {
      this.router.navigate(['/admin-settings/rdig-dropdown-options'], { queryParams: { group: g.id } });
      return;
    }

    this.router.navigate([], { relativeTo: this.route, queryParams: { group: g.id } });
  }

  goBack() {
    const isRdigRoute = this.route.snapshot.routeConfig?.path === 'rdig-dropdown-options';
    if (isRdigRoute) {
      this.router.navigate(['/admin-settings/dropdowns']);
      return;
    }

    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  addOption() {
    if (this.isRegionMetadataCategory()) {
      return;
    }

    this.editingOptionId.set(null);
    this.editingInitialPayload.set(null);
    this.newOptionValue.set('');
    this.showAddModal.set(true);
  }

  onModalSave(payload: AddOptionPayload) {
    const now = this.formatDisplayDate(new Date());
    const currentUserName = this.auth.currentUser()?.name ?? 'Unknown';

    if (this.editingOptionId()) {
      // update existing and propagate to shared forms
      const id = this.editingOptionId() as number;
      const original = this.dropdownOptions().find(o => o.id === id);
      if (original) {
        const originalNorm = original.value.trim().toLowerCase();
        const category = original.category;

        const allowedSharedForms = this.CATEGORY_SHARING_CONFIG[category];

        // Entries that are part of the original shared group. Non-shared categories
        // stay scoped to the selected option, even if another form has the same value.
        const originalShared = this.dropdownOptions().filter(e =>
          allowedSharedForms
            ? e.category === category &&
              e.value.trim().toLowerCase() === originalNorm &&
              allowedSharedForms.includes(e.formName)
            : e.id === original.id
        );

        const desiredForms = allowedSharedForms
          ? (payload.appliesTo && payload.appliesTo.length > 0 ? payload.appliesTo : [original.formName])
          : [original.formName];

        // Build new list: update entries that should remain, remove those unselected
        let nextList = this.dropdownOptions().filter(e => !originalShared.some(os => os.id === e.id));

        // Keep/update entries for forms that were in originalShared and are still desired
        for (const os of originalShared) {
          if (desiredForms.includes(os.formName)) {
            nextList.push({
              ...os,
              value: payload.name.trim(),
              status: payload.status,
              lastUpdated: now,
              createdBy: currentUserName,
            });
          }
          // if not desired, we omit (effectively deleting from that form)
        }

        // Add entries for desired forms that did not previously exist in originalShared
        const existingForms = new Set(originalShared.map(s => s.formName));
        let nextId = Math.max(...this.dropdownOptions().map(o => o.id), 0) + 1;
        for (const formName of desiredForms) {
          if (!existingForms.has(formName)) {
            nextList.push({
              id: nextId++,
              formName,
              category: category,
              value: payload.name.trim(),
              lastUpdated: now,
              createdBy: currentUserName,
              status: payload.status,
            } as DropdownOption);
          }
        }

        this.dropdownOptions.set(nextList);
        this.saveRegionMetadataIfNeeded(payload.name.trim(), payload, original.value);
        this.saveAccountCodeMetadataIfNeeded(payload.name.trim(), payload, original.value);
      }
    } else {
      // add one option per selected form (shared across forms)
      const nextIdStart = Math.max(...this.dropdownOptions().map(o => o.id), 0) + 1;
      let nextId = nextIdStart;
      const newEntries = payload.appliesTo.map(formName => ({
        id: nextId++,
        formName,
        category: this.selectedCategory() || '',
        value: payload.name.trim(),
        lastUpdated: now,
        createdBy: currentUserName,
        status: payload.status,
      } as DropdownOption));

      this.dropdownOptions.update(list => [...list, ...newEntries]);
      this.saveRegionMetadataIfNeeded(payload.name.trim(), payload);
      this.saveAccountCodeMetadataIfNeeded(payload.name.trim(), payload);
    }

    this.editingOptionId.set(null);
    this.newOptionValue.set('');
    this.showAddModal.set(false);
    this.saveOptionsToStorage();
  }

  editingInitial(): AddOptionPayload | null {
    const id = this.editingOptionId();
    if (!id) return null;
    const opt = this.dropdownOptions().find(o => o.id === id);
    if (!opt) return null;
    const shared = this.getSharedWithForms(opt);
    const appliesTo = [opt.formName, ...shared.filter(s => s !== opt.formName)];
    const regionMetadata = this.isRegionMetadataCategory() ? this.getRegionMetadata(opt.value) : null;
    const accountCodeMetadata = this.isAccountCodeMetadataCategory()
      ? this.getAccountCodeMetadata(opt.value, opt.formName, opt.category)
      : null;

    return {
      name: opt.value,
      status: opt.status,
      appliesTo,
      accountNumber: accountCodeMetadata?.accountNumber,
      percentage: regionMetadata?.percentage,
      limit: regionMetadata?.limit,
      description: regionMetadata?.description,
    };
  }

  saveOption(value: string) {
    if (!value.trim() || !this.selectedGroupId() || !this.selectedCategory()) {
      return;
    }

    const now = this.formatDisplayDate(new Date());
    const currentUserName = this.auth.currentUser()?.name ?? 'Unknown';
    const formName = this.selectedGroup()?.title ?? '';

    if (this.editingOptionId()) {
      // Update existing
      const id = this.editingOptionId() as number;
      this.dropdownOptions.update(list => list.map(o => o.id === id ? {
        ...o,
        value: value.trim(),
        lastUpdated: now,
        createdBy: currentUserName,
      } : o));
    } else {
      // Add new
      const newOption: DropdownOption = {
        id: Math.max(...this.dropdownOptions().map(o => o.id), 0) + 1,
        formName,
        category: this.selectedCategory(),
        value: value.trim(),
        lastUpdated: now,
        createdBy: currentUserName,
        status: 'Active',
      };
      this.dropdownOptions.update(options => [...options, newOption]);
    }

    this.editingOptionId.set(null);
    this.newOptionValue.set('');
    this.showAddModal.set(false);
    this.saveOptionsToStorage();
  }

  toggleStatus(id: number) {
    this.dropdownOptions.update(list => list.map(o => {
      if (o.id !== id) {
        return o;
      }

      const nextStatus: DropdownOption['status'] = o.status === 'Active' ? 'Inactive' : 'Active';
      return { ...o, status: nextStatus };
    }));

    this.saveOptionsToStorage();
  }


  editOption(id: number) {
    const option = this.dropdownOptions().find(o => o.id === id);
    if (option) {
      this.newOptionValue.set(option.value);
      this.editingOptionId.set(id);
      this.editingInitialPayload.set(this.editingInitial());
      this.showAddModal.set(true);
    }
  }

  closeModal() {
    this.showAddModal.set(false);
    this.editingOptionId.set(null);
    this.editingInitialPayload.set(null);
    this.newOptionValue.set('');
  }

  getSortIcon(key: DropdownSortKey): string {
    if (this.sortBy() !== key) return 'unfold_more';
    return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  onSortChange(columnKey: string) {
    if (this.sortBy() === columnKey) {
      this.sortDirection.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(columnKey as DropdownSortKey);
      this.sortDirection.set(columnKey === 'lastUpdated' ? 'desc' : 'asc');
    }
  }

  totalItems() {
    return this.dropdownOptions().length;
  }

  sharedWithLabel(option: DropdownOptionView): string {
    return option.sharedWith.length > 0 ? option.sharedWith.join(', ') : '-';
  }

  private getRegionMetadata(regionName: string): RegionMetadata {
    const stored = this.getStoredRegionMetadata(regionName);
    if (stored) {
      return stored;
    }

    const defaults = this.DEFAULT_REGION_METADATA[this.normalizeRegionKey(regionName)];
    return {
      createdDate: this.formatDisplayDate(new Date()),
      status: 'Active',
      percentage: defaults?.percentage,
      limit: defaults?.limit,
      description: defaults?.description,
    };
  }

  private getStoredRegionMetadata(regionName: string): RegionMetadata | null {
    for (const key of this.getRegionMetadataStorageKeys(regionName)) {
      const stored = localStorage.getItem(key);
      if (!stored) {
        continue;
      }

      try {
        return JSON.parse(stored) as RegionMetadata;
      } catch {
        return null;
      }
    }

    return null;
  }

  private getAccountCodeMetadata(
    optionName: string,
    formName: string = this.selectedGroup()?.title ?? '',
    category: string = this.selectedCategory()
  ): AccountCodeMetadata {
    return this.getStoredAccountCodeMetadata(optionName, formName, category) ?? {
      createdDate: this.formatDisplayDate(new Date()),
      status: 'Active',
    };
  }

  private getStoredAccountCodeMetadata(optionName: string, formName: string, category: string): AccountCodeMetadata | null {
    for (const key of this.getAccountCodeMetadataStorageKeys(optionName, formName, category)) {
      const stored = localStorage.getItem(key);
      if (!stored) {
        continue;
      }

      try {
        return JSON.parse(stored) as AccountCodeMetadata;
      } catch {
        return null;
      }
    }

    return null;
  }

  private seedDefaultRegionMetadata(): void {
    const regionOptions = this.dropdownOptions().filter(option =>
      option.formName === 'Conference Application' &&
      option.category === 'Select Region'
    );

    for (const option of regionOptions) {
      if (this.getStoredRegionMetadata(option.value)) {
        continue;
      }

      const defaults = this.DEFAULT_REGION_METADATA[this.normalizeRegionKey(option.value)];
      if (!defaults) {
        continue;
      }

      const metadata: RegionMetadata = {
        createdDate: option.lastUpdated || this.formatDisplayDate(new Date()),
        status: option.status,
        percentage: defaults.percentage,
        limit: defaults.limit,
        description: defaults.description,
      };

      for (const key of this.getRegionMetadataStorageKeys(option.value)) {
        localStorage.setItem(key, JSON.stringify(metadata));
      }
    }
  }

  private saveRegionMetadataIfNeeded(regionName: string, payload: AddOptionPayload, previousRegionName?: string): void {
    if (!this.isRegionMetadataCategory()) {
      return;
    }

    const previousMetadata = previousRegionName ? this.getRegionMetadata(previousRegionName) : {};
    const metadata: RegionMetadata = {
      ...previousMetadata,
      status: payload.status,
      percentage: this.toNumberOrUndefined(payload.percentage),
      limit: this.toNumberOrUndefined(payload.limit),
      description: payload.description?.trim() || previousMetadata.description,
      createdDate: previousMetadata.createdDate || this.formatDisplayDate(new Date()),
    };

    for (const key of this.getRegionMetadataStorageKeys(regionName)) {
      localStorage.setItem(key, JSON.stringify(metadata));
    }
  }

  private saveAccountCodeMetadataIfNeeded(optionName: string, payload: AddOptionPayload, previousOptionName?: string): void {
    if (!this.isAccountCodeMetadataCategory()) {
      return;
    }

    const formName = this.selectedGroup()?.title ?? '';
    const category = this.selectedCategory();
    const previousMetadata = previousOptionName
      ? this.getAccountCodeMetadata(previousOptionName, formName, category)
      : {};
    const metadata: AccountCodeMetadata = {
      ...previousMetadata,
      status: payload.status,
      accountNumber: payload.accountNumber?.trim() || previousMetadata.accountNumber,
      createdDate: previousMetadata.createdDate || this.formatDisplayDate(new Date()),
    };

    for (const key of this.getAccountCodeMetadataStorageKeys(optionName, formName, category)) {
      localStorage.setItem(key, JSON.stringify(metadata));
    }
  }

  private deleteMetadataForOption(option: DropdownOption): void {
    if (option.formName === 'Conference Application' && option.category === 'Select Region') {
      for (const key of this.getRegionMetadataStorageKeys(option.value)) {
        localStorage.removeItem(key);
      }
      return;
    }

    if (this.isAccountCodeMetadataOption(option)) {
      for (const key of this.getAccountCodeMetadataStorageKeys(option.value, option.formName, option.category)) {
        localStorage.removeItem(key);
      }
    }
  }

  private getRegionMetadataStorageKeys(regionName: string): string[] {
    const trimmed = regionName.trim();
    const normalized = this.normalizeRegionKey(trimmed);
    const slug = normalized.replace(/\s+/g, '-');

    return Array.from(new Set([
      `option-metadata-region-${trimmed}`,
      `option-metadata-region-${normalized}`,
      `option-metadata-region-${slug}`,
    ]));
  }

  private getAccountCodeMetadataStorageKeys(optionName: string, formName: string, category: string): string[] {
    const trimmed = optionName.trim();
    const normalized = trimmed.toLowerCase();
    const slug = normalized.replace(/\s+/g, '-');
    const formSlug = formName.trim().toLowerCase().replace(/\s+/g, '-');
    const categorySlug = category.trim().toLowerCase().replace(/\s+/g, '-');

    const keys = [
      `option-metadata-account-code-${formSlug}-${categorySlug}-${trimmed}`,
      `option-metadata-account-code-${formSlug}-${categorySlug}-${normalized}`,
      `option-metadata-account-code-${formSlug}-${categorySlug}-${slug}`,
    ];

    if (formName === 'Conference Application' && category === 'Select Item Description') {
      keys.push(
        `option-metadata-account-code-${trimmed}`,
        `option-metadata-account-code-${normalized}`,
        `option-metadata-account-code-${slug}`,
      );
    }

    return Array.from(new Set(keys));
  }

  private normalizeRegionKey(regionName: string): string {
    return regionName.trim().toLowerCase();
  }

  private toNumberOrUndefined(value: number | string | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private compareOptions(a: DropdownOption, b: DropdownOption, sortKey: DropdownSortKey): number {
    if (sortKey === 'lastUpdated') {
      return this.parseDisplayDate(a.lastUpdated) - this.parseDisplayDate(b.lastUpdated);
    }
    return a[sortKey].localeCompare(b[sortKey]);
  }

  private getSharedWithForms(option: DropdownOption): string[] {
    const normalizedValue = option.value.trim().toLowerCase();
    if (!normalizedValue) {
      return [];
    }

    // Get the forms allowed to share this category
    const allowedFormsForCategory = this.CATEGORY_SHARING_CONFIG[option.category];
    if (!allowedFormsForCategory) {
      // Category is not in the sharing config, so no sharing
      return [];
    }

    // Filter to only those forms that are allowed to share this category
    return Array.from(new Set(
      this.dropdownOptions()
        .filter(other =>
          other.id !== option.id &&
          other.category === option.category &&
          other.status === 'Active' &&
          other.value.trim().toLowerCase() === normalizedValue &&
          other.formName !== option.formName &&
          allowedFormsForCategory.includes(other.formName)
        )
        .map(other => other.formName)
        .filter(formName => formName.length > 0)
    )).sort((a, b) => a.localeCompare(b));
  }

  private formatDisplayDate(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseDisplayDate(dateValue: string): number {
    const slashMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    }

    const match = dateValue.match(/^(\d{2})\s([A-Za-z]{3})\s(\d{4})$/);
    if (match) {
      const monthLookup: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const [, day, monthText, year] = match;
      const month = monthLookup[monthText];
      if (month !== undefined) {
        return new Date(Number(year), month, Number(day)).getTime();
      }
    }

    const isoParsed = new Date(dateValue).getTime();
    if (!Number.isNaN(isoParsed)) {
      return isoParsed;
    }

    return 0;
  }

  private normalizeDisplayDate(dateValue?: string): string {
    if (!dateValue) {
      return this.formatDisplayDate(new Date());
    }

    const timestamp = this.parseDisplayDate(dateValue);
    if (!timestamp) {
      return this.formatDisplayDate(new Date());
    }

    return this.formatDisplayDate(new Date(timestamp));
  }
}
