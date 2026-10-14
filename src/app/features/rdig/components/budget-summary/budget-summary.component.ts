import { Component, Input, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  FormBuilder,
  FormControl,
  Validators,
} from '@angular/forms';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import type { DataTableColumn } from '../../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { DecimalAmountDirective } from '../../../../shared/directives/decimal-amount.directive';
import { MyrCurrencyPipe } from '../../../../shared/pipes/myr-currency.pipe';
import { TableRowCounterComponent } from '../../../../shared/components/table-row-counter/table-row-counter.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';

import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';

type BudgetCategoryKey =
  | 'studentAllowances'
  | 'travelAccommodation'
  | 'materialsSupplies'
  | 'specialServices';

@Component({
  selector: 'app-budget-summary',
  standalone: true,
  imports: [
    TableActionIconComponent,
    ReactiveFormsModule,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    CharacterCounterComponent,
    ReviewBlockComponent,
    DataTableComponent,
    DialogComponent,
    ValidationMessageComponent,
    ActionButtonComponent,
    NoteComponent,
    DecimalAmountDirective,
    MyrCurrencyPipe,
    TableRowCounterComponent,
    FileUploadComponent,
  ],
  templateUrl: './budget-summary.component.html',
  styleUrl: './budget-summary.component.scss',
})
export class BudgetSummaryComponent implements OnInit {
  readonly maxRowsByCategory: Record<BudgetCategoryKey, number> = {
    studentAllowances: 3,
    travelAccommodation: 10,
    materialsSupplies: 10,
    specialServices: 5,
  };

  @Input({ required: true }) parentForm!: FormGroup;
  @Input() showHosComments = false;
  @Input() showRmcComments = false;
  @Input() showR1Comments = false;
  @Input() showR2Comments = false;
  @Input() showRdigChairComments = false;
  @Input() showVcComments = false;
  @Input() showCfoComments = false;
  @Input() submitAttempted = false;

  get showAnyComments(): boolean {
    return (
      this.showHosComments ||
      this.showRmcComments ||
      this.showR1Comments ||
      this.showR2Comments ||
      this.showRdigChairComments ||
      this.showVcComments ||
      this.showCfoComments
    );
  }
  @Input() workflow!: RdigWorkflowService;

  get budgetForm() {
    return this.parentForm.get('budget') as FormGroup;
  }

  get projectDetails() {
    return this.parentForm.get('projectDetails') as FormGroup;
  }

  get category() {
    return this.projectDetails.get('category')?.value;
  }

  get studentAllowances() {
    return this.budgetForm.get('studentAllowances') as FormArray;
  }
  get travelAccommodation() {
    return this.budgetForm.get('travelAccommodation') as FormArray;
  }
  get materialsSupplies() {
    return this.budgetForm.get('materialsSupplies') as FormArray;
  }
  get specialServices() {
    return this.budgetForm.get('specialServices') as FormArray;
  }

  get otherRemarksControl(): FormControl {
    return this.budgetForm.get('otherRemarks') as FormControl;
  }

  readonly budgetCategoryLabels: Record<BudgetCategoryKey, string> = {
    studentAllowances: 'V11000 - Student Allowances',
    travelAccommodation: 'V21000 - Travelling and Accommodation',
    materialsSupplies: 'V27000 - Research Materials and Supplies',
    specialServices: 'V29000 - Special Services',
  };

  readonly budgetCategoryHints: Record<BudgetCategoryKey, string> = {
    studentAllowances: "Example: Master's Student GRA (6 months)",
    travelAccommodation: 'Example: Conference travel - international',
    materialsSupplies: 'Example: Lab consumables, survey tools',
    specialServices: 'Example: Statistical consultancy, software license',
  };

  addItemModalOpen = false;
  activeBudgetCategory: BudgetCategoryKey | null = null;
  editingRowIndex: number | null = null;

  readonly budgetItemForm: FormGroup;

  readonly budgetColumns: DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'description', label: 'Description of Expense' },
    { key: 'amount', label: 'Amount (RM)', width: 'var(--size-table-column-amount)' },
    { key: 'remarks', label: 'Remarks', width: '25%' },
    {
      key: 'actions',
      label: '',
      width: 'var(--size-table-column-actions)',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  private readonly attachmentColumn: DataTableColumn = {
    key: 'attachment',
    label: 'Attachment',
    width: '25%',
  };

  readonly trackByIndex = (index: number) => index;

  get descriptionControl(): FormControl {
    return this.budgetItemForm.get('description') as FormControl;
  }

  get amountControl(): FormControl {
    return this.budgetItemForm.get('amount') as FormControl;
  }

  get remarksControl(): FormControl {
    return this.budgetItemForm.get('remarks') as FormControl;
  }

  get attachmentFileControl(): FormControl {
    return this.budgetItemForm.get('attachmentFile') as FormControl;
  }

  constructor(private fb: FormBuilder) {
    this.budgetItemForm = this.fb.group({
      description: ['', [Validators.required, Validators.maxLength(200)]],
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      remarks: ['', [Validators.maxLength(300)]],
      quotationAttachmentId: [null as number | null],
      attachmentFile: [null as File | null],
    });
  }

  ngOnInit() {
    this.budgetForm.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  addBudgetRow(array: FormArray) {
    const row = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: ['', [Validators.maxLength(300)]],
    });
    array.push(row);
  }

  openAddItemModal(category: BudgetCategoryKey): void {
    if (this.isBudgetCategoryFull(category)) return;

    this.activeBudgetCategory = category;
    this.editingRowIndex = null;
    this.addItemModalOpen = true;
    this.budgetItemForm.reset({
      description: '', amount: null, remarks: '', quotationAttachmentId: null, attachmentFile: null,
    });
    this.updateAttachmentRequirement();
    this.budgetItemForm.markAsPristine();
    this.budgetItemForm.markAsUntouched();
  }

  openEditItemModal(category: BudgetCategoryKey, index: number): void {
    const categoryArray = this.getBudgetArray(category);
    const row = categoryArray.at(index);
    if (!row) return;

    this.activeBudgetCategory = category;
    this.editingRowIndex = index;
    this.addItemModalOpen = true;
    this.budgetItemForm.reset({
      description: row.get('description')?.value ?? '',
      amount: row.get('amount')?.value ?? null,
      remarks: row.get('remarks')?.value ?? '',
      quotationAttachmentId: row.get('quotationAttachmentId')?.value ?? null,
      attachmentFile: null,
    });
    this.updateAttachmentRequirement();
    this.budgetItemForm.markAsPristine();
    this.budgetItemForm.markAsUntouched();
  }

  closeAddItemModal(): void {
    this.addItemModalOpen = false;
    this.activeBudgetCategory = null;
    this.editingRowIndex = null;
  }

  submitBudgetItem(): void {
    if (!this.activeBudgetCategory) return;

    this.updateAttachmentRequirement();

    if (this.budgetItemForm.invalid) {
      this.budgetItemForm.markAllAsTouched();
      return;
    }

    const categoryArray = this.getBudgetArray(this.activeBudgetCategory);
    const payload = {
      description: this.descriptionControl.value,
      amount: this.toAmountNumber(this.amountControl.value),
      remarks: this.remarksControl.value,
      quotationAttachmentId: this.budgetItemForm.get('quotationAttachmentId')?.value ?? null,
      attachmentFile: this.attachmentFileControl.value ?? null,
    };

    if (this.editingRowIndex === null) {
      categoryArray.push(
        this.fb.group({
          description: [payload.description, Validators.required],
          amount: [payload.amount, [Validators.required, Validators.min(0.01)]],
          remarks: [payload.remarks, [Validators.maxLength(300)]],
          quotationAttachmentId: [payload.quotationAttachmentId],
          attachmentFile: [payload.attachmentFile],
        }),
      );
    } else {
      categoryArray.at(this.editingRowIndex)?.patchValue(payload);
    }

    this.closeAddItemModal();
  }

  get modalSubmitLabel(): string {
    return this.editingRowIndex === null ? 'Add to Table' : 'Save Changes';
  }

  get activeCategoryLabel(): string {
    if (!this.activeBudgetCategory) return 'Budget Item';
    return this.budgetCategoryLabels[this.activeBudgetCategory];
  }

  get activeCategoryHint(): string {
    if (!this.activeBudgetCategory) return 'Describe the requested budget item.';
    return this.budgetCategoryHints[this.activeBudgetCategory];
  }

  budgetColumnsFor(category: BudgetCategoryKey): DataTableColumn[] {
    if (category === 'studentAllowances') return this.budgetColumns;
    return [
      ...this.budgetColumns.slice(0, 4),
      this.attachmentColumn,
      ...this.budgetColumns.slice(4),
    ];
  }

  budgetAttachmentLabel(row: { quotationAttachmentId?: number | null; attachmentFile?: File | null }): string {
    if (row.attachmentFile instanceof File) return row.attachmentFile.name;
    return row.quotationAttachmentId ? 'Attached' : '—';
  }

  onBudgetAttachmentSelected(file: File | null): void {
    this.attachmentFileControl.setValue(file);
    this.attachmentFileControl.markAsTouched();
    this.updateAttachmentRequirement();
  }

  updateAttachmentRequirement(): void {
    const control = this.attachmentFileControl;
    const existingAttachmentId = this.budgetItemForm.get('quotationAttachmentId')?.value;
    const description = String(this.descriptionControl.value ?? '').toLowerCase();
    const isRequired = this.activeBudgetCategory === 'materialsSupplies'
      || (this.activeBudgetCategory === 'specialServices'
        && (description.includes('editing service') || description.includes('publication fee')));

    if (isRequired && !existingAttachmentId) {
      control.setValidators(Validators.required);
    } else {
      control.clearValidators();
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  get attachmentLabel(): string {
    const category = this.activeBudgetCategory;
    const description = String(this.descriptionControl.value ?? '').toLowerCase();
    if (category === 'specialServices' && description.includes('publication fee')) {
      return 'APC Page (Required)';
    }
    if (category === 'specialServices' && description.includes('editing service')) {
      return 'Quotation (Required)';
    }
    return this.activeBudgetCategory === 'materialsSupplies'
      ? 'Quotation (Required)'
      : 'Supporting Attachment (Optional)';
  }

  get uploadedBudgetAttachmentName(): string | null {
    const id = this.budgetItemForm.get('quotationAttachmentId')?.value;
    return id ? `Existing attachment #${id}` : null;
  }

  isBudgetCategoryFull(category: BudgetCategoryKey): boolean {
    return this.getBudgetArray(category).length >= this.maxRowsByCategory[category];
  }

  private getBudgetArray(category: BudgetCategoryKey): FormArray {
    return this.budgetForm.get(category) as FormArray;
  }

  removeBudgetRow(array: FormArray, index: number) {
    array.removeAt(index);
  }

  calculateTotal() {
    const sum = (arr: FormArray) =>
      arr.controls.reduce((acc, ctrl) => acc + this.toAmountNumber(ctrl.get('amount')?.value), 0);
    const total =
      sum(this.studentAllowances) +
      sum(this.travelAccommodation) +
      sum(this.materialsSupplies) +
      sum(this.specialServices);

    this.budgetForm.get('totalRequest')?.setValue(total, { emitEvent: false });
    this.budgetForm.updateValueAndValidity({ emitEvent: false });
  }

  get isBudgetInvalidRange(): boolean {
    const total = this.toAmountNumber(this.budgetForm.get('totalRequest')?.value);
    if (this.category === 'S&T') return total < 20000 || total > 30000;
    if (this.category === 'Non S&T') return total < 5000 || total > 10000;
    return false;
  }

  get budgetAlertColor(): string {
    const total = this.toAmountNumber(this.budgetForm.get('totalRequest')?.value);
    let limitMin = 0;
    if (this.category === 'S&T') limitMin = 20000;
    else if (this.category === 'Non S&T') limitMin = 5000;

    if (total < limitMin) {
      return this.submitAttempted ? 'red' : 'yellow';
    }
    if (this.isBudgetInvalidRange) {
      return this.submitAttempted ? 'red' : 'yellow';
    }
    return 'default';
  }

  get budgetRangeMessage(): string {
    if (this.category === 'S&T') return 'RM 20,000.00 - RM 30,000.00';
    if (this.category === 'Non S&T') return 'RM 5,000.00 - RM 10,000.00';
    return '';
  }

  private get reviewBudget(): FormGroup {
    return this.parentForm.get('reviewBudget') as FormGroup;
  }

  fc(name: string): FormControl {
    return this.reviewBudget.get(name) as FormControl;
  }

  private toAmountNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const normalized = String(value).replace(/,/g, '').trim();
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }
}
