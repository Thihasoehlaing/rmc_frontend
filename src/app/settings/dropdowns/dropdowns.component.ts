import { Component, TrackByFunction, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { AddOptionModalComponent, AddOptionPayload } from '../../shared/components/add-option-modal/add-option-modal.component';
import type { DataTableColumn } from '../../shared/components/data-table/data-table.component';

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
  imports: [CommonModule, FormsModule, RouterModule, ActionButtonComponent, DataTableComponent, AddOptionModalComponent],
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
    'Type of Organisation': ['RDIG Application', 'Conference Application'],
  };

  groups = signal<DropdownGroup[]>([
    { id: 1, title: 'RDIG Application', categories: ['Research Cluster', 'Type of Organisation', 'Research Domain', 'Sub-Research Domain', 'ESG Factors', 'SDG Alignment'], items: 17, shared: 11 },
    { id: 2, title: 'RA/GRA Application', categories: ['Research Cluster', 'Programme Type', 'Supervisor Type', 'Funding Type'], items: 16, shared: 10 },
    { id: 3, title: 'Conference Application', categories: ['Select Region', 'Select Item Description', 'Type of Organisation', 'Staff Name'], items: 15, shared: 6 },
    { id: 4, title: 'Journal Application', categories: ['Vote Number Description', 'Vote Number', 'Account Code Description', 'Account Code'], items: 13, shared: 10 },
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

  tableColumns: DataTableColumn[] = [
    { key: 'value', label: 'Option Name', sortable: true },
    { key: 'sharedWith', label: 'Shared With' },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'lastUpdated', label: 'Created Date', sortable: true },
    { key: 'actions', label: 'Actions' },
  ];

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

    return filtered.map(option => ({
      ...option,
      sharedWith: this.getSharedWithForms(option),
    }));
  });

  ngOnInit(): void {
    this.loadOptionsFromStorage();
    console.log('[DEBUG] DropdownsComponent initialized');
    this.route.queryParams.subscribe(params => {
      const id = Number(params['group']);
      this.selectedGroupId.set(!Number.isNaN(id) && id > 0 ? id : null);
      this.selectedCategory.set('');
      this.searchQuery.set('');
      this.statusFilter.set('all');
    });
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    // reset selected rows and status filter when switching categories
    this.searchQuery.set('');
    this.statusFilter.set('all');
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
    } catch (error) {
      console.error('Failed to load dropdown options from localStorage:', error);
      this.dropdownOptions.set(this.getDefaultOptions());
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
    ];
  }

  openGroup(g: DropdownGroup) {
    // If RDIG group is clicked, open the dedicated RDIG dropdown management page
    if (g.title.toLowerCase().includes('rdig')) {
      this.router.navigate(['/settings/rdig-dropdown-options']);
      return;
    }

    this.router.navigate([], { relativeTo: this.route, queryParams: { group: g.id } });
  }

  goBack() {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  addOption() {
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

        // entries that are part of the original shared group (same category + normalized value)
        const originalShared = this.dropdownOptions().filter(e =>
          e.category === category && e.value.trim().toLowerCase() === originalNorm
        );

        const desiredForms = payload.appliesTo && payload.appliesTo.length > 0 ? payload.appliesTo : [original.formName];

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
    return { name: opt.value, status: opt.status, appliesTo };
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
