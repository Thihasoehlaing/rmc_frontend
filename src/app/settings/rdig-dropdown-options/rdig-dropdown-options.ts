import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { RdigDropdownOptionsService, DropdownCategoryKey, DropdownOptionEntityEntity as DropdownOptionEntity, CATEGORY_LABELS } from '../rdig-dropdown-options.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type { DataTableColumn } from '../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { ValidationMessageComponent } from '../../shared/components/validation-message/validation-message.component';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button.component';

@Component({
  selector: 'app-rdig-dropdown-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DataTableComponent,
    DialogComponent,
    ValidationMessageComponent,
    ActionButtonComponent,
  ],
  templateUrl: './rdig-dropdown-options.html',
  styleUrl: './rdig-dropdown-options.scss',
})
export class RdigDropdownOptions implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly optionsService = inject(RdigDropdownOptionsService);
  private readonly router = inject(Router);

  categories = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key: key as DropdownCategoryKey, label }));

  // Computed counts per category for the chip UI
  categoryCounts = computed(() => this.categories.map(c => ({
    key: c.key,
    label: c.label,
    count: this.optionsService.getOptionsSnapshot(c.key).length,
  })));

  categoryCtrl = new FormControl<DropdownCategoryKey>('research_cluster', { nonNullable: true });
  parentDomainCtrl = new FormControl<number | null>(null);
  statusFilterCtrl = new FormControl<'all' | 'active' | 'inactive'>('all', { nonNullable: true });

  researchDomains$: Observable<DropdownOptionEntity[]> = of([]);
  filteredOptions$!: Observable<DropdownOptionEntity[]>;

  tableColumns: DataTableColumn[] = [
    { key: 'select', label: '', width: '56px', align: 'center', headerAlign: 'center' },
    { key: 'optionName', label: 'Option Name' },
    { key: 'status', label: 'Status' },
    { key: 'createdDate', label: 'Created Date' },
    { key: 'actions', label: 'Actions' }
  ];

  showModal = signal(false);
  editingRowId = signal<number | null>(null);
  selectedIds = signal<number[]>([]);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  optionForm!: FormGroup;
  inlineEditForm!: FormGroup;

  canDeleteSelected = computed(() => this.selectedIds().length > 0);

  private destroy$ = new Subject<void>();
  private allDomains: DropdownOptionEntity[] = [];

  ngOnInit(): void {
    this.initCreateForm();
    this.initInlineEditForm();

    this.optionsService.loadOptions('research_domain').subscribe();

    this.researchDomains$ = this.optionsService.getOptions('research_domain');
    this.researchDomains$.pipe(takeUntil(this.destroy$)).subscribe(domains => {
      this.allDomains = domains;
    });

    this.filteredOptions$ = combineLatest([
      this.categoryCtrl.valueChanges.pipe(
        startWith(this.categoryCtrl.value),
        switchMap(category => {
          this.selectedIds.set([]);
          this.editingRowId.set(null);
          this.optionsService.loadOptions(category).subscribe();
          return this.optionsService.getOptions(category);
        })
      ),
      this.parentDomainCtrl.valueChanges.pipe(startWith(this.parentDomainCtrl.value)),
      this.statusFilterCtrl.valueChanges.pipe(startWith(this.statusFilterCtrl.value))
    ]).pipe(
      map(([options, parentDomainId, statusFilter]) => {
        let filtered = options;
        if (this.categoryCtrl.value === 'sub_research_domain' && parentDomainId !== null) {
          filtered = filtered.filter(o => o.parentDomainId === parentDomainId);
        }
        if (statusFilter === 'active') {
          filtered = filtered.filter(o => o.status === 'Active');
        } else if (statusFilter === 'inactive') {
          filtered = filtered.filter(o => o.status === 'Inactive');
        }
        return filtered;
      })
    );

    this.categoryCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.parentDomainCtrl.setValue(null);
      this.updateColumns();
      this.updateCreateFormValidators();
    });

    this.updateColumns();
  }

  selectCategory(key: DropdownCategoryKey): void {
    this.categoryCtrl.setValue(key);
    this.selectedIds.set([]);
    this.editingRowId.set(null);
    this.parentDomainCtrl.setValue(null);
  }

  goBack(): void {
    this.router.navigate(['/settings/dropdowns']);
  }

  private updateColumns() {
    if (this.categoryCtrl.value === 'sub_research_domain') {
      this.tableColumns = [
        { key: 'select', label: '', width: '56px', align: 'center', headerAlign: 'center' },
        { key: 'optionName', label: 'Option Name' },
        { key: 'parentDomainId', label: 'Parent Domain' },
        { key: 'status', label: 'Status' },
        { key: 'createdDate', label: 'Created Date' },
        { key: 'actions', label: 'Actions' }
      ];
    } else {
      this.tableColumns = [
        { key: 'select', label: '', width: '56px', align: 'center', headerAlign: 'center' },
        { key: 'optionName', label: 'Option Name' },
        { key: 'status', label: 'Status' },
        { key: 'createdDate', label: 'Created Date' },
        { key: 'actions', label: 'Actions' }
      ];
    }
  }

  private initCreateForm() {
    this.optionForm = this.fb.group({
      id: [null],
      optionName: ['', [Validators.required, Validators.maxLength(120)]],
      parentDomainId: [null],
      status: ['Active' as 'Active' | 'Inactive', Validators.required]
    });
    this.updateCreateFormValidators();
  }

  private initInlineEditForm() {
    this.inlineEditForm = this.fb.group({
      optionName: ['', [Validators.required, Validators.maxLength(120)]],
      parentDomainId: [null],
    });
  }

  private updateCreateFormValidators() {
    const parentCtrl = this.optionForm.get('parentDomainId');
    if (this.categoryCtrl.value === 'sub_research_domain') {
      parentCtrl?.setValidators([Validators.required]);
    } else {
      parentCtrl?.clearValidators();
    }
    parentCtrl?.updateValueAndValidity();
  }

  private updateInlineFormValidators() {
    const parentCtrl = this.inlineEditForm.get('parentDomainId');
    if (this.categoryCtrl.value === 'sub_research_domain') {
      parentCtrl?.setValidators([Validators.required]);
    } else {
      parentCtrl?.clearValidators();
    }
    parentCtrl?.updateValueAndValidity();
  }

  getParentDomainName(id: number | undefined): string {
    if (!id) return '-';
    const domain = this.allDomains.find(d => d.id === id);
    return domain ? domain.optionName : '-';
  }

  openAddModal(): void {
    this.optionForm.reset({
      id: null,
      optionName: '',
      status: 'Active',
      parentDomainId: null,
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  startInlineEdit(option: DropdownOptionEntity): void {
    this.editingRowId.set(option.id);
    this.updateInlineFormValidators();
    this.inlineEditForm.reset({
      optionName: option.optionName,
      parentDomainId: option.parentDomainId,
    });
  }

  cancelInlineEdit(): void {
    this.editingRowId.set(null);
    this.inlineEditForm.reset({ optionName: '', parentDomainId: null });
  }

  saveInlineEdit(option: DropdownOptionEntity): void {
    if (this.inlineEditForm.invalid) {
      this.inlineEditForm.markAllAsTouched();
      return;
    }

    const formValue = this.inlineEditForm.getRawValue();
    const optionName = (formValue.optionName ?? '').trim();
    const parentDomainId = formValue.parentDomainId ?? undefined;
    if (!optionName) return;

    if (this.hasDuplicate(optionName, option.id, parentDomainId)) {
      this.feedback.set({ type: 'error', text: 'Duplicate option is not allowed for this dropdown.' });
      return;
    }

    this.optionsService.updateOption(this.categoryCtrl.value, {
      ...option,
      optionName,
      parentDomainId,
    });

    this.feedback.set({ type: 'success', text: 'Option updated successfully.' });
    this.cancelInlineEdit();
  }

  saveOption(): void {
    if (this.optionForm.invalid) {
      this.optionForm.markAllAsTouched();
      return;
    }

    const formValue = this.optionForm.getRawValue();
    const optionName = (formValue.optionName ?? '').trim();
    const parentDomainId = formValue.parentDomainId ?? undefined;
    if (!optionName) return;

    if (this.hasDuplicate(optionName, null, parentDomainId)) {
      this.feedback.set({ type: 'error', text: 'Duplicate option is not allowed for this dropdown.' });
      return;
    }

    this.optionsService.addOption(this.categoryCtrl.value, {
      optionName,
      status: formValue.status,
      parentDomainId,
    });

    this.feedback.set({ type: 'success', text: 'Option created successfully.' });
    this.closeModal();
  }

  toggleStatus(option: DropdownOptionEntity): void {
    this.optionsService.toggleStatus(this.categoryCtrl.value, option.id);
    const action = option.status === 'Active' ? 'deactivated' : 'activated';
    this.feedback.set({ type: 'success', text: `Option ${action}.` });
  }

  onRowSelectionChange(id: number, checked: boolean): void {
    const next = checked
      ? [...this.selectedIds(), id]
      : this.selectedIds().filter(existingId => existingId !== id);
    this.selectedIds.set(next);
  }

  isRowSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  deleteSelected(): void {
    const ids = this.selectedIds();
    if (!ids.length) return;
    this.optionsService.deleteOptions(this.categoryCtrl.value, ids);
    this.selectedIds.set([]);
    this.editingRowId.set(null);
    this.feedback.set({ type: 'success', text: 'Selected options deleted.' });
  }

  formatDate(dateIso: string): string {
    const date = new Date(dateIso);
    return date.toLocaleDateString('en-GB');
  }

  private hasDuplicate(optionName: string, currentId: number | null, parentDomainId?: number): boolean {
    const normalizedName = optionName.toLowerCase().trim();
    const currentOptions = this.optionsService
      .getOptionsSnapshot(this.categoryCtrl.value)
      .filter(item => currentId === null || item.id !== currentId);

    if (this.categoryCtrl.value === 'sub_research_domain') {
      return currentOptions.some(item =>
        item.optionName.toLowerCase().trim() === normalizedName &&
        item.parentDomainId === parentDomainId,
      );
    }

    return currentOptions.some(item => item.optionName.toLowerCase().trim() === normalizedName);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
