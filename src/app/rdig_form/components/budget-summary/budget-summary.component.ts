import { Component, Input, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';

type BudgetCategoryKey = 'studentAllowances' | 'travelAccommodation' | 'materialsSupplies' | 'specialServices';

@Component({
  selector: 'app-budget-summary',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    CharacterCounterComponent,
    ReviewBlockComponent,
    DataTableComponent,
    DialogComponent,
    ValidationMessageComponent,
    ActionButtonComponent,
  ],
  templateUrl: './budget-summary.component.html',
  styleUrl: './budget-summary.component.scss'
})
export class BudgetSummaryComponent implements OnInit {
  @Input({ required: true }) parentForm!: FormGroup;
  @Input() showHosComments = false;
  @Input() showRmcComments = false;
  @Input() showR1Comments = false;
  @Input() showR2Comments = false;
  @Input() showRdigChairComments = false;
  @Input() showVcComments = false;
  @Input() showCeoComments = false;
  @Input() submitAttempted = false;

  get showAnyComments(): boolean {
    return this.showHosComments || this.showRmcComments ||
      this.showR1Comments || this.showR2Comments ||
      this.showRdigChairComments || this.showVcComments || this.showCeoComments;
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

  get studentAllowances() { return this.budgetForm.get('studentAllowances') as FormArray; }
  get travelAccommodation() { return this.budgetForm.get('travelAccommodation') as FormArray; }
  get materialsSupplies() { return this.budgetForm.get('materialsSupplies') as FormArray; }
  get specialServices() { return this.budgetForm.get('specialServices') as FormArray; }

  get otherRemarksControl(): FormControl {
    return this.budgetForm.get('otherRemarks') as FormControl;
  }

  readonly budgetCategoryLabels: Record<BudgetCategoryKey, string> = {
    studentAllowances: 'V11000 - Student Allowances',
    travelAccommodation: 'V21000 - Travelling and Accommodation',
    materialsSupplies: 'V27000 - Research Materials and Supplies',
    specialServices: 'V29000 - Special Services'
  };

  readonly budgetCategoryHints: Record<BudgetCategoryKey, string> = {
    studentAllowances: 'Example: Master\'s Student GRA (6 months)',
    travelAccommodation: 'Example: Conference travel - international',
    materialsSupplies: 'Example: Lab consumables, survey tools',
    specialServices: 'Example: Statistical consultancy, software license'
  };

  addItemModalOpen = false;
  activeBudgetCategory: BudgetCategoryKey | null = null;
  editingRowIndex: number | null = null;

  readonly budgetItemForm: FormGroup;

  readonly budgetColumns: DataTableColumn[] = [
    { key: 'index', label: '#', width: '52px', align: 'center', headerAlign: 'center' },
    { key: 'description', label: 'Description of Expense', width: '40%' },
    { key: 'amount', label: 'Amount (RM)', width: '160px' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'actions', label: '', width: '92px', align: 'right', headerAlign: 'right' }
  ];

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

  constructor(private fb: FormBuilder) {
    this.budgetItemForm = this.fb.group({
      description: ['', [Validators.required, Validators.maxLength(200)]],
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      remarks: ['', [Validators.required, Validators.maxLength(300)]]
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
      remarks: ['', [Validators.required, Validators.maxLength(300)]]
    });
    array.push(row);
  }

  openAddItemModal(category: BudgetCategoryKey): void {
    this.activeBudgetCategory = category;
    this.editingRowIndex = null;
    this.addItemModalOpen = true;
    this.budgetItemForm.reset({ description: '', amount: null, remarks: '' });
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
      remarks: row.get('remarks')?.value ?? ''
    });
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

    if (this.budgetItemForm.invalid) {
      this.budgetItemForm.markAllAsTouched();
      return;
    }

    const categoryArray = this.getBudgetArray(this.activeBudgetCategory);
    const payload = {
      description: this.descriptionControl.value,
      amount: this.amountControl.value,
      remarks: this.remarksControl.value
    };

    if (this.editingRowIndex === null) {
      categoryArray.push(this.fb.group({
        description: [payload.description, Validators.required],
        amount: [payload.amount, [Validators.required, Validators.min(0.01)]],
        remarks: [payload.remarks, [Validators.required, Validators.maxLength(300)]],
      }));
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

  private getBudgetArray(category: BudgetCategoryKey): FormArray {
    return this.budgetForm.get(category) as FormArray;
  }

  removeBudgetRow(array: FormArray, index: number) {
    array.removeAt(index);
  }

  calculateTotal() {
    const sum = (arr: FormArray) => arr.controls.reduce((acc, ctrl) => acc + (ctrl.get('amount')?.value || 0), 0);
    const total = sum(this.studentAllowances) + sum(this.travelAccommodation) +
      sum(this.materialsSupplies) + sum(this.specialServices);

    this.budgetForm.get('totalRequest')?.setValue(total, { emitEvent: false });
    this.budgetForm.updateValueAndValidity({ emitEvent: false });
  }

  get isBudgetInvalidRange(): boolean {
    const total = this.budgetForm.get('totalRequest')?.value ?? 0;
    if (this.category === 'S&T') return total < 20000 || total > 30000;
    if (this.category === 'Non S&T') return total < 5000 || total > 10000;
    return false;
  }

  get budgetAlertColor(): string {
    const total = this.budgetForm.get('totalRequest')?.value ?? 0;
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
    if (this.category === 'S&T') return 'RM 20,000 - RM 30,000';
    if (this.category === 'Non S&T') return 'RM 5,000 - RM 10,000';
    return '';
  }

  private get reviewBudget(): FormGroup {
    return this.parentForm.get('reviewBudget') as FormGroup;
  }

  fc(name: string): FormControl {
    return this.reviewBudget.get(name) as FormControl;
  }
}
