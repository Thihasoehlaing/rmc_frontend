import { Component, TrackByFunction, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
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

interface DropdownGroup {
  id: number;
  title: string;
  categories: string[];
  items: number;
  shared?: number;
}

type DropdownSortKey = 'value' | 'lastUpdated' | 'createdBy';
type DropdownStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-dropdowns',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ActionButtonComponent, DataTableComponent],
  templateUrl: './dropdowns.component.html',
  styleUrls: ['./dropdowns.component.scss'],
})
export class DropdownsComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly STORAGE_KEY = 'rmc_dropdowns_data';

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
  statusFilter = signal<DropdownStatusFilter>('all');
  sortBy = signal<DropdownSortKey>('value');
  sortDirection = signal<'asc' | 'desc'>('asc');
  showAddModal = signal(false);
  editingOptionId = signal<number | null>(null);
  newOptionValue = signal<string>('');
  selectedIds = signal<Set<number>>(new Set());

  tableColumns: DataTableColumn[] = [
    { key: 'select', label: '', width: '56px', align: 'center', headerAlign: 'center' },
    { key: 'optionName', label: 'Option Name' },
    { key: 'status', label: 'Status' },
    { key: 'createdDate', label: 'Created Date' },
    { key: 'actions', label: 'Actions' },
  ];

  trackById: TrackByFunction<DropdownGroup> = (i, g) => g.id;
  trackByOptionId: TrackByFunction<DropdownOption> = (i, o) => o.id;

  selectedGroup = computed(() => this.groups().find(g => g.id === this.selectedGroupId()) ?? null);
  selectedGroupCategories = computed(() => this.selectedGroup()?.categories ?? []);

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

  filteredOptions = computed(() => {
    // Only show options if a form AND category are explicitly selected
    if (!this.selectedGroupId() || !this.selectedCategory()) {
      return [];
    }

    let filtered = this.dropdownOptions();

    filtered = filtered.filter(o =>
      o.formName === this.selectedGroup()?.title &&
      o.category === this.selectedCategory()
    );

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

    return filtered;
  });

  ngOnInit(): void {
    this.loadOptionsFromStorage();
    console.log('[DEBUG] DropdownsComponent initialized');
    this.route.queryParams.subscribe(params => {
      const id = Number(params['group']);
      this.selectedGroupId.set(!Number.isNaN(id) && id > 0 ? id : null);
      this.selectedCategory.set('');
      this.statusFilter.set('all');
      this.selectedIds.set(new Set());
    });
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    // reset selected rows and status filter when switching categories
    this.selectedIds.set(new Set());
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
          lastUpdated: item.lastUpdated ?? this.formatDisplayDate(new Date()),
          createdBy: item.createdBy ?? 'Unknown',
          status: item.status === 'Inactive' ? 'Inactive' : 'Active',
        })));
      } else {
        this.dropdownOptions.set(this.getDefaultOptions());
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
    this.selectedIds.set(new Set());
  }

  addOption() {
    this.editingOptionId.set(null);
    this.newOptionValue.set('');
    this.showAddModal.set(true);
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

  deleteOption(id: number) {
    this.dropdownOptions.update(options => options.filter(o => o.id !== id));
    this.selectedIds.update(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    this.saveOptionsToStorage();
  }

  isRowSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  onRowSelectionChange(id: number, checked: boolean) {
    this.selectedIds.update(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  canDeleteSelected(): boolean {
    return this.selectedIds().size > 0;
  }

  deleteSelected() {
    const selected = this.selectedIds();
    if (selected.size === 0) {
      return;
    }

    this.dropdownOptions.update(list => list.filter(o => !selected.has(o.id)));
    this.selectedIds.set(new Set());
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
      this.showAddModal.set(true);
    }
  }

  closeModal() {
    this.showAddModal.set(false);
    this.editingOptionId.set(null);
    this.newOptionValue.set('');
  }

  getSortIcon(key: DropdownSortKey): string {
    if (this.sortBy() !== key) return 'unfold_more';
    return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  onHeaderClick(key: string) {
    this.onSortChange(key);
  }

  onSortChange(columnKey: string) {
    if (this.sortBy() === columnKey) {
      this.sortDirection.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(columnKey as DropdownSortKey);
      this.sortDirection.set('asc');
    }
  }

  totalItems() {
    return this.dropdownOptions().length;
  }

  private compareOptions(a: DropdownOption, b: DropdownOption, sortKey: DropdownSortKey): number {
    if (sortKey === 'lastUpdated') {
      return this.parseDisplayDate(a.lastUpdated) - this.parseDisplayDate(b.lastUpdated);
    }
    return a[sortKey].localeCompare(b[sortKey]);
  }

  private formatDisplayDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private parseDisplayDate(dateValue: string): number {
    const parsed = new Date(dateValue).getTime();
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    const match = dateValue.match(/^(\d{2})\s([A-Za-z]{3})\s(\d{4})$/);
    if (!match) {
      return 0;
    }
    const monthLookup: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const [, day, monthText, year] = match;
    const month = monthLookup[monthText];
    if (month === undefined) {
      return 0;
    }
    return new Date(Number(year), month, Number(day)).getTime();
  }
}
