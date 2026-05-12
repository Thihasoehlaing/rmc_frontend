import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AddOptionModalComponent, AddOptionPayload } from '../../shared/components/add-option-modal/add-option-modal.component';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button.component';
import { DataTableComponent, DataTableColumn } from '../../shared/components/data-table/data-table.component';
import { DropdownsStoreService } from '../dropdowns/dropdowns-store.service';
import { Router } from '@angular/router';
import { RdigDropdownOptionsService, DropdownCategoryKey, DropdownOptionEntityEntity, CATEGORY_LABELS } from '../rdig-dropdown-options.service';

interface DropdownCategoryOption {
  value: DropdownCategoryKey;
  label: string;
}

interface DropdownOptionView extends DropdownOptionEntityEntity {
  sharedWith: string[];
}

@Component({
  selector: 'app-rdig-dropdown-options',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AddOptionModalComponent, ActionButtonComponent, DataTableComponent],
  templateUrl: './rdig-dropdown-options.html',
  styleUrls: ['./rdig-dropdown-options.scss']
})
export class RdigDropdownOptions implements OnInit {
  private readonly RDIG_FORM_NAME = 'RDIG Application';
  private readonly RAGRA_FORM_NAME = 'RA/GRA Application';
  private readonly JOURNAL_FORM_NAME = 'Journal Application';
  private readonly optionsService = inject(RdigDropdownOptionsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dropdownsStore = inject(DropdownsStoreService);

  selectedCategory = signal<DropdownCategoryKey | null>(null);
  optionForm!: FormGroup;
  isModalOpen = signal(false);
  editingOptionIndex = signal<number | null>(null);
  editingInitialPayload = signal<AddOptionPayload | null>(null);
  selectedCheckboxes = signal<Set<number>>(new Set());
  searchQuery = signal<string>('');
  filterStatus = signal<'All' | 'Active' | 'Inactive'>('All');
  sortColumn = signal<string>('createdDate');
  sortDirection = signal<'asc' | 'desc'>('desc');

  researchDomains$ = signal<DropdownOptionEntityEntity[]>([]);

  categoryOptions: DropdownCategoryOption[] = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    value: key as DropdownCategoryKey,
    label
  }));

  readonly CATEGORY_LABELS = CATEGORY_LABELS;

  tableColumns: DataTableColumn[] = [
    { key: 'select', label: '', width: '50px', align: 'center' },
    { key: 'optionName', label: 'Option Name', sortable: true },
    { key: 'sharedWith', label: 'Shared With', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'createdDate', label: 'Created Date', sortable: true },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' },
  ];

  modalAvailableForms = computed(() => this.getAllowedFormsForCategory(this.selectedCategory()));
  modalDefaultSelectedForms = computed(() => {
    const allowed = this.modalAvailableForms();
    if (allowed.includes(this.RDIG_FORM_NAME) && allowed.includes(this.RAGRA_FORM_NAME)) {
      return [this.RDIG_FORM_NAME, this.RAGRA_FORM_NAME];
    }
    return allowed.includes(this.RDIG_FORM_NAME) ? [this.RDIG_FORM_NAME] : allowed;
  });

  categoryCounts = computed(() => {
    return this.categoryOptions.map(cat => ({
      name: cat.label,
      value: cat.value,
      count: this.optionsService.getOptionsSnapshot(cat.value).length
    }));
  });

  shareableForms = computed(() => {
    const category = this.selectedCategory();
    if (!category) {
      return [] as string[];
    }

    const categoryLabel = CATEGORY_LABELS[category];
    const formsFromStore = Array.from(new Set(
      this.dropdownsStore.entries()
        .filter(option => option.category === categoryLabel && option.formName)
        .map(option => option.formName)
    )).sort((a, b) => a.localeCompare(b));

    const allowedForms = this.getAllowedFormsForCategory(category);
    return formsFromStore.filter(form => allowedForms.includes(form));
  });

  getFilteredAndSortedOptions = computed<DropdownOptionView[]>(() => {
    const options = this.getCurrentOptions();
    const status = this.filterStatus();
    const query = this.searchQuery().trim().toLowerCase();

    const filtered = options.filter(opt => {
      const matchesSearch = !query || opt.optionName.toLowerCase().includes(query);
      const matchesStatus = status === 'All' || opt.status === status;
      return matchesSearch && matchesStatus;
    });

    const rows = filtered.map(option => ({
      ...option,
      sharedWith: this.getSharedWithForms(option),
    }));

    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();

    if (!sortCol) {
      return rows;
    }

    const direction = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => this.compareRows(a, b, sortCol) * direction);
  });

  hasSelectedOptions = computed(() => this.selectedCheckboxes().size > 0);

  totalItems() {
    return this.categoryOptions.reduce((sum, cat) => sum + this.optionsService.getOptionsSnapshot(cat.value).length, 0);
  }

  ngOnInit() {
    this.initializeOptionForm();
    this.optionsService.loadOptions('research_domain').subscribe();
  }

  private initializeOptionForm() {
    this.optionForm = this.fb.group({
      optionName: ['', [Validators.required, Validators.maxLength(120)]],
      status: ['Active'],
      parentDomainId: [null]
    });
  }

  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterStatus.set(target.value as 'All' | 'Active' | 'Inactive');
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  getCurrentOptions(): DropdownOptionEntityEntity[] {
    const category = this.selectedCategory();
    if (!category) {
      return [];
    }
    return this.optionsService.getOptionsSnapshot(category);
  }

  isSubResearchDomainType(): boolean {
    return this.selectedCategory() === 'sub_research_domain';
  }

  onCategoryChange(selectedValue: string) {
    this.selectedCategory.set(selectedValue as DropdownCategoryKey);
    this.resetForm();
    this.selectedCheckboxes.set(new Set());
    this.searchQuery.set('');
    this.filterStatus.set('All');
    this.sortColumn.set('createdDate');
    this.sortDirection.set('desc');

    if (selectedValue === 'sub_research_domain') {
      this.optionsService.loadOptions('research_domain').subscribe(domains => {
        this.researchDomains$.set(domains);
      });
    }
  }

  toggleCheckbox(optionId: number) {
    const selected = new Set(this.selectedCheckboxes());
    if (selected.has(optionId)) {
      selected.delete(optionId);
    } else {
      selected.add(optionId);
    }
    this.selectedCheckboxes.set(selected);
  }

  isOptionSelected(optionId: number): boolean {
    return this.selectedCheckboxes().has(optionId);
  }

  deleteSelectedOptions() {
    const selectedIds = Array.from(this.selectedCheckboxes());
    if (selectedIds.length === 0 || !this.selectedCategory()) {
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedIds.length} option(s)?`)) {
      return;
    }

    try {
      this.optionsService.deleteOptions(this.selectedCategory()!, selectedIds);
      this.selectedCheckboxes.set(new Set());
    } catch (error) {
      console.error('Error deleting selected options:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }

  openAddModal() {
    this.editingOptionIndex.set(null);
    this.editingInitialPayload.set(null);
    this.optionForm.reset({ status: 'Active', parentDomainId: null });
    this.isModalOpen.set(true);
  }

  onModalSave(payload: AddOptionPayload) {
    if (!this.selectedCategory()) return;
    const categoryLabel = CATEGORY_LABELS[this.selectedCategory()!];
    const createdBy = 'Admin';

    // When editing, we must update/remove/add entries in the central store
    const newValue = payload.name.trim();
    const newNorm = newValue.toLowerCase();

    const originalIdx = this.editingOptionIndex();
    const originalOptionsInStore = this.dropdownsStore.entries().filter(e => e.category === categoryLabel);

    if (originalIdx !== null) {
      // Editing existing RDIG option
      const currentOptions = this.getCurrentOptions();
      const originalOption = currentOptions[originalIdx];
      const oldNorm = originalOption.optionName.trim().toLowerCase();

      // Determine forms that previously had this option (in central store)
      const previouslySharedForms = Array.from(new Set(
        originalOptionsInStore.filter(e => e.value.trim().toLowerCase() === oldNorm).map(e => e.formName)
      ));

      const desiredForms = payload.appliesTo || [];
      // Forms to ensure present/update: desiredForms

      // For each form in the union of previouslySharedForms and desiredForms, compute replacement list
      const formsToConsider = Array.from(new Set([...previouslySharedForms, ...desiredForms]));

      for (const formName of formsToConsider) {
        try {
          const existing = this.dropdownsStore.getOptions(formName, categoryLabel);

          // Build replacement array for this form: keep entries that are not the old value, and add/update the new value
          const replacements = existing
            .filter(e => e.value.trim().toLowerCase() !== oldNorm)
            .map(e => ({ id: e.id, value: e.value, lastUpdated: e.lastUpdated, createdBy: e.createdBy, status: e.status }));

          if (desiredForms.includes(formName)) {
            // Ensure new value exists in replacements (update lastUpdated if exists in original central store)
            const found = existing.find(e => e.value.trim().toLowerCase() === newNorm);
            if (found) {
              // update existing entry's value casing and lastUpdated
              replacements.push({ id: found.id, value: newValue, lastUpdated: this.getTodayDate(), createdBy, status: found.status });
            } else {
              // create new id (use max id + 1 across store)
              const maxId = this.dropdownsStore.entries().reduce((m, it) => Math.max(m, it.id), 0);
              replacements.push({ id: maxId + 1, value: newValue, lastUpdated: this.getTodayDate(), createdBy, status: payload.status });
            }
          }

          // If form is not desired and was previously present, we simply omit the old value (effectively remove)
          this.dropdownsStore.replaceCategoryOptions(formName, categoryLabel, replacements);
        } catch (err) {
          console.error('Failed to replace category options for', formName, err);
        }
      }
    } else {
      // Not editing RDIG; just add to central store as before
      for (const formName of payload.appliesTo) {
        try {
          this.dropdownsStore.upsertOptions(formName, categoryLabel, [payload.name], createdBy);
        } catch (err) {
          console.error('Failed to upsert option in central store', err);
        }
      }
    }

    // If editing, update the existing RDIG option; otherwise add a new one
    try {
      if (this.editingOptionIndex() !== null) {
        const currentOptions = this.getCurrentOptions();
        const originalOption = currentOptions[this.editingOptionIndex()!];
        if (originalOption) {
          if (payload.appliesTo.includes(this.RDIG_FORM_NAME)) {
            this.optionsService.updateOption(this.selectedCategory()!, {
              ...originalOption,
              optionName: payload.name,
              status: payload.status
            });
          } else {
            // If RDIG is deselected while editing, remove it from RDIG options table.
            this.optionsService.deleteOptions(this.selectedCategory()!, [originalOption.id]);
          }
        }
      } else if (payload.appliesTo.includes(this.RDIG_FORM_NAME)) {
        const optionPayload = this.selectedCategory() === 'sub_research_domain'
          ? { optionName: payload.name, status: payload.status, parentDomainId: undefined }
          : { optionName: payload.name, status: payload.status };

        this.optionsService.addOption(this.selectedCategory()!, optionPayload);
      }
    } catch (err) {
      console.error('Failed to add/update option in RDIG service', err);
    }

    this.closeModal();
  }

  editingInitial(): AddOptionPayload | null {
    const idx = this.editingOptionIndex();
    if (idx === null) return null;
    const options = this.getCurrentOptions();
    const opt = options[idx];
    if (!opt) return null;

    // Include RDIG Application plus any other forms that share this value
    const allowedForms = new Set(this.getAllowedFormsForCategory(this.selectedCategory()));
    const shared = this.getSharedWithForms(opt);
    const appliesTo = [
      this.RDIG_FORM_NAME,
      ...shared.filter(s => s !== this.RDIG_FORM_NAME && allowedForms.has(s))
    ];
    return { name: opt.optionName, status: opt.status || 'Active', appliesTo };
  }

  editOption(option: DropdownOptionEntityEntity, index: number) {
    this.editingOptionIndex.set(index);
    this.optionForm.patchValue({
      optionName: option.optionName,
      status: option.status || 'Active',
      parentDomainId: option.parentDomainId || null
    });
    this.editingInitialPayload.set(this.editingInitial());
    this.isModalOpen.set(true);
  }

  saveOption() {
    if (this.optionForm.invalid || !this.selectedCategory()) {
      return;
    }

    const category = this.selectedCategory()!;
    const optionName = this.optionForm.get('optionName')?.value;
    const status = this.optionForm.get('status')?.value;
    const parentDomainId = this.optionForm.get('parentDomainId')?.value;

    try {
      if (this.editingOptionIndex() === null) {
        this.optionsService.addOption(category, {
          optionName,
          status,
          parentDomainId
        });
      } else {
        const currentOptions = this.getCurrentOptions();
        const originalOption = currentOptions[this.editingOptionIndex()!];
        this.optionsService.updateOption(category, {
          ...originalOption,
          optionName,
          status,
          parentDomainId
        });
      }
      this.closeModal();
    } catch (error) {
      console.error('Error saving option:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }

  deactivateOption(optionId: number, currentStatus: string) {
    const category = this.selectedCategory()!;
    const options = this.getCurrentOptions();
    const option = options.find(o => o.id === optionId);

    if (!option) return;

    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      this.optionsService.updateOption(category, {
        ...option,
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating option:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingInitialPayload.set(null);
    this.resetForm();
  }

  onHeaderClick(columnName: string): void {
    if (columnName === this.sortColumn()) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columnName);
      this.sortDirection.set('asc');
    }
  }

  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;

    if (value === 'date') {
      this.sortColumn.set('createdDate');
      this.sortDirection.set('desc');
    } else {
      this.sortColumn.set('optionName');
      this.sortDirection.set('asc');
    }
  }

  /** Get sort indicator for column header (↕, ↑, ↓) */
  getSortIndicator(columnName: string): string {
    if (this.sortColumn() === columnName) {
      const dir = this.sortDirection();
      return dir === 'asc' ? ' ↑' : dir === 'desc' ? ' ↓' : '';
    }
    return this.isSortableColumn(columnName) ? ' ↕' : '';
  }

  /** Which columns are sortable in the RDIG table */
  isSortableColumn(columnName: string): boolean {
    return ['optionName', 'status', 'createdDate', 'parentDomainId'].includes(columnName);
  }

  /** Delete a single option by id */
  deleteOption(optionId: number) {
    if (!this.selectedCategory()) return;
    if (!confirm('Are you sure you want to delete this option?')) return;
    try {
      this.optionsService.deleteOptions(this.selectedCategory()!, [optionId]);
      // remove from selected checkboxes if present
      const next = new Set(this.selectedCheckboxes());
      next.delete(optionId);
      this.selectedCheckboxes.set(next);
    } catch (err) {
      console.error('Failed to delete option', err);
      alert(`Error: ${(err as Error).message}`);
    }
  }

  private resetForm() {
    this.optionForm.reset({ status: 'Active', parentDomainId: null });
    this.editingOptionIndex.set(null);
  }

  goBack(): void {
    this.router.navigate(['/settings/dropdowns']);
  }

  private getSharedWithForms(option: DropdownOptionEntityEntity): string[] {
    const category = this.selectedCategory();
    if (!category) {
      return [];
    }

    const allowedForms = this.getAllowedFormsForCategory(category);
    const categoryLabel = CATEGORY_LABELS[category];
    const normalizedValue = option.optionName.trim().toLowerCase();
    if (!normalizedValue) {
      return [];
    }

    return Array.from(new Set(
      this.dropdownsStore.entries()
        .filter(entry =>
          entry.category === categoryLabel &&
          entry.status === 'Active' &&
          entry.value.trim().toLowerCase() === normalizedValue &&
          entry.formName !== this.RDIG_FORM_NAME &&
          allowedForms.includes(entry.formName)
        )
        .map(entry => entry.formName)
        .filter(formName => formName.length > 0)
    )).sort((a, b) => a.localeCompare(b));
  }

  getParentDomainName(parentDomainId: number | undefined): string {
    if (!parentDomainId) {
      return '-';
    }

    const domain = this.researchDomains$().find(item => item.id === parentDomainId);
    return domain?.optionName || '-';
  }

  private compareRows(a: DropdownOptionView, b: DropdownOptionView, columnName: string): number {
    switch (columnName) {
      case 'optionName':
        return a.optionName.localeCompare(b.optionName);
      case 'sharedWith': {
        const valueA = a.sharedWith.join(', ').toLowerCase();
        const valueB = b.sharedWith.join(', ').toLowerCase();
        return valueA.localeCompare(valueB);
      }
      case 'parentDomainId':
        return this.getParentDomainName(a.parentDomainId).localeCompare(this.getParentDomainName(b.parentDomainId));
      case 'status':
        return a.status.localeCompare(b.status);
          case 'createdDate':
          default:
            return this.parseDisplayDate(a.createdDate) - this.parseDisplayDate(b.createdDate);
    }
  }

  private getAllowedFormsForCategory(category: DropdownCategoryKey | null): string[] {
    if (!category) {
      return [];
    }

    // Research Cluster: shared with RA/GRA only (not Journal)
    if (category === 'research_cluster') {
      return [this.RDIG_FORM_NAME, this.RAGRA_FORM_NAME];
    }

    // Type of Organisation: shared with Conference only (not Journal)
    if (category === 'type_of_organisation') {
      return [this.RDIG_FORM_NAME, 'Conference Application'];
    }

    // All other categories: RDIG only (not shared with any other form or Journal)
    return [this.RDIG_FORM_NAME];
  }

  getTodayDate(): string {
    return this.formatDisplayDate(new Date());
  }

  formatRowDate(dateValue?: string): string {
    return this.normalizeDisplayDate(dateValue);
  }

  private formatDisplayDate(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseDisplayDate(dateValue?: string): number {
    if (!dateValue) {
      return 0;
    }

    const slashMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    }

    const shortMonthMatch = dateValue.match(/^(\d{2})\s([A-Za-z]{3})\s(\d{4})$/);
    if (shortMonthMatch) {
      const monthLookup: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const [, day, monthText, year] = shortMonthMatch;
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
    const timestamp = this.parseDisplayDate(dateValue);
    if (!timestamp) {
      return this.formatDisplayDate(new Date());
    }
    return this.formatDisplayDate(new Date(timestamp));
  }
}
