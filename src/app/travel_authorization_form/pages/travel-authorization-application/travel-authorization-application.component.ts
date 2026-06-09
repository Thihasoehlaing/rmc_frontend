import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl, AbstractControl } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { NoteComponent } from '../../../shared/components/note/note.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { FormWizardNavComponent } from '../../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ReviewBlockComponent } from '../../../rdig_form/components/review-block/review-block.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';

interface FunctionalAreaOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-travel-authorization-application',
  standalone: true,
  imports: [
    CommonModule,
    SearchableDropdownComponent,
    ReactiveFormsModule,
    ValidationMessageComponent,
    CustomHeaderComponent,
    NoteComponent,
    DialogComponent,
    FileUploadComponent,
    FormWizardNavComponent,
    ReviewBlockComponent,
    DataTableComponent,
  ],
  templateUrl: './travel-authorization-application.component.html',
  styleUrl: './travel-authorization-application.component.scss',
})
export class TravelAuthorizationApplicationComponent implements OnInit {
  private fb = inject(FormBuilder);

  travelAuthForm!: FormGroup;
  expenseForm!: FormGroup;
  expenses: any[] = [];
  isExpenseModalOpen = false;
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  editExpenseIndex: number | null = null;
  isSubmitting = signal(false);

  // Comment visibility toggles for all 7 roles
  showHosComments = signal(false);
  showRmcComments = signal(false);
  showVcComments = signal(false);
  showHrComments = signal(false);
  showCeoComments = signal(false);
  showFinanceComments = signal(false);
  showCooComments = signal(false);

  // Computed signal to check if any comments are visible
  showAnyComments = computed(() =>
    (this.showHosToggle() && this.getHosCommentState().visible) ||
    (this.showRmcToggle() && this.getRmcCommentState().visible) ||
    (this.showVcToggle() && this.getVcCommentState().visible) ||
    (this.showHrToggle() && this.getHrCommentState().visible) ||
    (this.showCeoToggle() && this.getCeoCommentState().visible) ||
    (this.showFinanceToggle() && this.getFinanceCommentState().visible) ||
    (this.showCooToggle() && this.getCooCommentState().visible)
  );

  // DEV TEST: Status override for testing
  travelStatus = signal('submitted');

  // DEV TEST: Travel status options for ABAC testing
  travelStatusOptions = [
    { label: 'Applicant_Draft', value: 'applicant_draft' },
    { label: 'HOS_Draft', value: 'hos_draft' },
    { label: 'Applicant_Resub', value: 'applicant_resub' },
    { label: 'HOS_Resub', value: 'hos_resub' },
    { label: 'Pending_HOS', value: 'pending_hos' },
    { label: 'HOS_Request_Resubmission', value: 'hos_request_resubmission' },
    { label: 'HOS_Reject', value: 'hos_reject' },
    { label: 'Pending_RMC', value: 'pending_rmc' },
    { label: 'RMC_Request_Resubmission', value: 'rmc_request_resubmission' },
    { label: 'RMC_Reject', value: 'rmc_reject' },
    { label: 'Pending_VC', value: 'pending_vc' },
    { label: 'VC_Reject', value: 'vc_reject' },
    { label: 'Pending_HR', value: 'pending_hr' },
    { label: 'HR_Reject', value: 'hr_reject' },
    { label: 'Pending_CEO', value: 'pending_ceo' },
    { label: 'CEO_Reject', value: 'ceo_reject' },
    { label: 'Pending_Finance', value: 'pending_finance' },
    { label: 'Finance_Reject', value: 'finance_reject' },
    { label: 'Pending_COO', value: 'pending_coo' },
    { label: 'COO_Reject', value: 'coo_reject' },
    { label: 'Approved', value: 'approved' },
  ];

  expenseTypeOptions: FunctionalAreaOption[] = [
    { label: 'Accommodation', value: 'accommodation' },
    { label: 'Transportation', value: 'transportation' },
    { label: 'Meals', value: 'meals' },
    { label: 'Conference Fee', value: 'conference-fee' },
    { label: 'Other', value: 'other' },
  ];

  functionalAreaOptions: FunctionalAreaOption[] = [
    { label: 'Digital Learning Hub', value: 'digital-learning-hub' },
    { label: 'Research & Development', value: 'research-development' },
    { label: 'Operations', value: 'operations' },
    { label: 'Administration', value: 'administration' },
  ];

  staffParticipationOptions: FunctionalAreaOption[] = [
    { label: 'Staff Member 1', value: 'staff-1' },
    { label: 'Staff Member 2', value: 'staff-2' },
    { label: 'Staff Member 3', value: 'staff-3' },
    { label: 'Staff Member 4', value: 'staff-4' },
    { label: 'Staff Member 5', value: 'staff-5' },
    { label: 'Staff Member 6', value: 'staff-6' },
    { label: 'Staff Member 7', value: 'staff-7' },
    { label: 'Staff Member 8', value: 'staff-8' },
    { label: 'Staff Member 9', value: 'staff-9' },
    { label: 'Staff Member 10', value: 'staff-10' },
    { label: 'Staff Member 11', value: 'staff-11' },
    { label: 'Staff Member 12', value: 'staff-12' },
    { label: 'Staff Member 13', value: 'staff-13' },
    { label: 'Staff Member 14', value: 'staff-14' },
    { label: 'Staff Member 15', value: 'staff-15' },
    { label: 'Staff Member 16', value: 'staff-16' },
    { label: 'Staff Member 17', value: 'staff-17' },
    { label: 'Staff Member 18', value: 'staff-18' },
    { label: 'Staff Member 19', value: 'staff-19' },
    { label: 'Staff Member 20', value: 'staff-20' },
  ];

  externalBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '50px', align: 'center' },
    { key: 'itemDescription', label: 'Item Description' },
    { key: 'voteNumber', label: 'Vote Number' },
    { key: 'cost', label: 'Cost (Foreign/MYR)' },
    { key: 'exchangeRate', label: 'Exchange Rate' },
    { key: 'costInRM', label: 'Cost in RM' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' }
  ];

  ngOnInit() {
    this.initializeForm();
    this.initializeExpenseForm();
    // Update form disabled state based on initial status
    this.updateFormDisabledState();
  }

  /**
   * DEV TEST: Live override for travel status (ABAC testing)
   * Change this value to test different application workflows
   */
  onTestStatusChange(val: string): void {
    this.travelStatus.set(val);
    this.updateFormDisabledState();
  }

  /**
   * Update form disabled/enabled state based on current travel status
   * Keep main form fields disabled in pending states, but enable the editable comment field
   */
  private updateFormDisabledState(): void {
    const status = this.travelStatus();

    if (this.isFormReadOnly()) {
      // Disable entire form first
      this.travelAuthForm.disable({ emitEvent: false });

      // Then selectively enable the comment field for the current pending role
      const reviewCommentsGroup = this.travelAuthForm.get('reviewComments');
      if (reviewCommentsGroup) {
        switch (status) {
          case 'pending_hos':
            reviewCommentsGroup.get('hosComment')?.enable({ emitEvent: false });
            break;
          case 'pending_rmc':
            reviewCommentsGroup.get('rmcComment')?.enable({ emitEvent: false });
            break;
          case 'pending_vc':
            reviewCommentsGroup.get('vcComment')?.enable({ emitEvent: false });
            break;
          case 'pending_hr':
            reviewCommentsGroup.get('hrComment')?.enable({ emitEvent: false });
            break;
          case 'pending_ceo':
            reviewCommentsGroup.get('ceoComment')?.enable({ emitEvent: false });
            break;
          case 'pending_finance':
            reviewCommentsGroup.get('financeComment')?.enable({ emitEvent: false });
            break;
          case 'pending_coo':
            reviewCommentsGroup.get('cooComment')?.enable({ emitEvent: false });
            break;
        }
      }
    } else {
      this.travelAuthForm.enable({ emitEvent: false });
    }
  }

  // Toggle methods for comment visibility
  toggleHosComments(): void {
    this.showHosComments.update(val => !val);
  }

  toggleRmcComments(): void {
    this.showRmcComments.update(val => !val);
  }

  toggleVcComments(): void {
    this.showVcComments.update(val => !val);
  }

  toggleHrComments(): void {
    this.showHrComments.update(val => !val);
  }

  toggleCeoComments(): void {
    this.showCeoComments.update(val => !val);
  }

  toggleFinanceComments(): void {
    this.showFinanceComments.update(val => !val);
  }

  toggleCooComments(): void {
    this.showCooComments.update(val => !val);
  }

  /**
   * Workflow Logic: Determine form editability based on travel status
   */
  isFormReadOnly(): boolean {
    const status = this.travelStatus();
    const readOnlyStatuses = [
      'pending_hos',
      'hos_reject',
      'pending_rmc',
      'rmc_reject',
      'pending_vc',
      'vc_reject',
      'pending_hr',
      'hr_reject',
      'pending_ceo',
      'ceo_reject',
      'pending_finance',
      'finance_reject',
      'pending_coo',
      'coo_reject',
      'approved',
    ];
    return readOnlyStatuses.includes(status);
  }

  /**
   * Workflow Logic: Show HOS toggle button when status allows
   */
  showHosToggle(): boolean {
    const status = this.travelStatus();
    return [
      'applicant_resub',
      'hos_resub',
      'hos_request_resubmission',
      'pending_hos',
      'hos_reject',
      'pending_rmc',
      'rmc_request_resubmission',
      'rmc_reject',
      'pending_vc',
      'vc_reject',
      'pending_hr',
      'hr_reject',
      'pending_ceo',
      'ceo_reject',
      'pending_finance',
      'finance_reject',
      'pending_coo',
      'coo_reject',
      'approved',
    ].includes(status);
  }

  /**
   * Workflow Logic: Show RMC toggle button when status allows
   */
  showRmcToggle(): boolean {
    const status = this.travelStatus();
    return [
      'applicant_resub',
      'hos_resub',
      'hos_request_resubmission',
      'rmc_request_resubmission',
      'pending_rmc',
      'rmc_reject',
      'pending_vc',
      'vc_reject',
      'pending_hr',
      'hr_reject',
      'pending_ceo',
      'ceo_reject',
      'pending_finance',
      'finance_reject',
      'pending_coo',
      'coo_reject',
      'approved',
    ].includes(status);
  }

  /**
   * Workflow Logic: Show VC toggle button when status allows
   */
  showVcToggle(): boolean {
    const status = this.travelStatus();
    return [
      'pending_vc',
      'vc_reject',
      'pending_hr',
      'hr_reject',
      'pending_ceo',
      'ceo_reject',
      'pending_finance',
      'finance_reject',
      'pending_coo',
      'coo_reject',
      'approved',
    ].includes(status);
  }

  /**
   * Workflow Logic: Show HR toggle button when status allows
   */
  showHrToggle(): boolean {
    const status = this.travelStatus();
    return [
      'pending_hr',
      'hr_reject',
      'pending_ceo',
      'ceo_reject',
      'pending_finance',
      'finance_reject',
      'pending_coo',
      'coo_reject',
      'approved',
    ].includes(status);
  }

  /**
   * Workflow Logic: Show CEO toggle button when status allows
   */
  showCeoToggle(): boolean {
    const status = this.travelStatus();
    return [
      'pending_ceo',
      'ceo_reject',
      'pending_finance',
      'finance_reject',
      'pending_coo',
      'coo_reject',
      'approved',
    ].includes(status);
  }

  /**
   * Workflow Logic: Show Finance toggle button when status allows
   */
  showFinanceToggle(): boolean {
    const status = this.travelStatus();
    return [
      'pending_finance',
      'finance_reject',
      'pending_coo',
      'coo_reject',
      'approved',
    ].includes(status);
  }

  /**
   * Workflow Logic: Show COO toggle button when status allows
   */
  showCooToggle(): boolean {
    const status = this.travelStatus();
    return [
      'pending_coo',
      'coo_reject',
      'approved',
    ].includes(status);
  }

  /**
   * Workflow Logic: Auto-show and control editability for HOS comments based on status
   */
  getHosCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible = ['applicant_resub', 'pending_rmc', 'rmc_reject', 'hos_reject', 'approved'].includes(status) || this.showHosComments();
    const editable = status === 'pending_hos';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for RMC comments based on status
   */
  getRmcCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible = ['applicant_resub', 'hos_resub', 'hos_request_resubmission', 'rmc_request_resubmission', 'pending_rmc', 'rmc_reject', 'approved'].includes(status) || this.showRmcComments();
    const editable = status === 'pending_rmc';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for VC comments based on status
   */
  getVcCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible = ['pending_vc', 'vc_reject', 'approved'].includes(status) || this.showVcComments();
    const editable = status === 'pending_vc';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for HR comments based on status
   */
  getHrCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible = ['pending_hr', 'hr_reject', 'approved'].includes(status) || this.showHrComments();
    const editable = status === 'pending_hr';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for CEO comments based on status
   */
  getCeoCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible = ['pending_ceo', 'ceo_reject', 'approved'].includes(status) || this.showCeoComments();
    const editable = status === 'pending_ceo';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for Finance comments based on status
   */
  getFinanceCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible = ['pending_finance', 'finance_reject', 'approved'].includes(status) || this.showFinanceComments();
    const editable = status === 'pending_finance';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for COO comments based on status
   */
  getCooCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible = ['pending_coo', 'coo_reject', 'approved'].includes(status) || this.showCooComments();
    const editable = status === 'pending_coo';
    return { visible, editable };
  }

  /**
   * Helper method to get form controls
   */
  fc(path: string): FormControl {
    return this.travelAuthForm.get(path) as FormControl;
  }

  private initializeExpenseForm() {
    this.expenseForm = this.fb.group({
      accountCode: ['', [Validators.required]],
      typeOfExpense: ['', [Validators.required]],
      description: [''],
      amountForeignCurrency: ['', [Validators.required, Validators.pattern('^[0-9]+(?:\\.[0-9]+)?$')]],
      exchangeRate: ['', [Validators.required, Validators.pattern('^[0-9]+(?:\\.[0-9]+)?$')]],
      amountMYR: [{ value: '', disabled: true }],
      fileUpload: [''],
    });
  }

  private initializeForm() {
    this.travelAuthForm = this.fb.group({
      applicantName: ['', [Validators.required]],
      staffId: ['', [Validators.required]],
      functionalArea: ['', [Validators.required]],
      staffEmail: ['', [Validators.required, Validators.email]],
      travelType: ['external', [Validators.required]],
      location: ['', [Validators.required]],
      departureDate: ['', [Validators.required]],
      returnDate: ['', [Validators.required]],
      reasonForRequest: ['', [Validators.required]],
      staffParticipation: [[], [Validators.required]],
      programmeLocation: ['', [Validators.required]],
      declarationAgreed: [false, Validators.requiredTrue],
      declarationFalseMisleading: [false, Validators.requiredTrue],
      declarationTermsPolicies: [false, Validators.requiredTrue],
      declarationAccuracy: [false, Validators.requiredTrue],
      // Review comments group for all 7 roles
      reviewComments: this.fb.group({
        hosComment: ['', [Validators.maxLength(500)]],
        rmcComment: ['', [Validators.maxLength(500)]],
        vcComment: ['', [Validators.maxLength(500)]],
        hrComment: ['', [Validators.maxLength(500)]],
        ceoComment: ['', [Validators.maxLength(500)]],
        financeComment: ['', [Validators.maxLength(500)]],
        cooComment: ['', [Validators.maxLength(500)]],
      }),
    });
  }

  get isExternalTravel(): boolean {
    return this.travelAuthForm.get('travelType')?.value === 'external';
  }

  addExpense() {
    if (this.expenseForm.valid) {
      const expense = this.expenseForm.getRawValue();
      this.expenses.push(expense);
      this.expenseForm.reset();
    }
  }

  removeExpense(index: number) {
    this.expenses.splice(index, 1);
  }

  getExternalBreakdownTableData(): (Record<string, unknown> & { index: number })[] {
    return this.expenses.map((expense, index) => ({
      index: index + 1,
      itemDescription: expense.typeOfExpense,
      voteNumber: expense.accountCode,
      cost: Number(expense.amountForeignCurrency || 0),
      exchangeRate: Number(expense.exchangeRate || 0),
      costInRM: Number(expense.amountMYR || 0),
    }));
  }

  calculateMYR() {
    const amount = parseFloat(this.expenseForm.get('amountForeignCurrency')?.value || 0);
    const rate = parseFloat(this.expenseForm.get('exchangeRate')?.value || 0);
    const total = (amount * rate).toFixed(2);
    this.expenseForm.get('amountMYR')?.setValue(total);
  }

  onDecimalFieldInput(controlName: 'amountForeignCurrency' | 'exchangeRate'): void {
    const control = this.expenseForm.get(controlName);

    if (!control) {
      return;
    }

    const sanitizedValue = this.sanitizeDecimalValue(control.value);

    if (sanitizedValue !== control.value) {
      control.setValue(sanitizedValue, { emitEvent: false });
    }

    this.calculateMYR();
  }

  restrictDecimalInput(event: KeyboardEvent, controlName: 'amountForeignCurrency' | 'exchangeRate'): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Clear',
    ];

    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase())) {
      return;
    }

    if (allowedKeys.includes(event.key) || /^\d$/.test(event.key)) {
      return;
    }

    if (event.key === '.') {
      const currentValue = String(this.expenseForm.get(controlName)?.value ?? '');
      if (!currentValue.includes('.')) {
        return;
      }
    }

    event.preventDefault();
  }

  private sanitizeDecimalValue(value: unknown): string {
    const rawValue = String(value ?? '');
    const cleanedValue = rawValue.replace(/[^\d.]/g, '');

    if (!cleanedValue) {
      return '';
    }

    const [integerPart = '', ...decimalParts] = cleanedValue.split('.');
    const decimalPart = decimalParts.join('');

    if (cleanedValue.includes('.')) {
      return `${integerPart || '0'}.${decimalPart}`;
    }

    return integerPart;
  }

  openExpenseModal() {
    this.expenseForm.reset();
    this.editExpenseIndex = null;
    this.isExpenseModalOpen = true;
  }

  editExpense(index: number) {
    const expense = this.expenses[index];
    this.expenseForm.patchValue(expense);
    this.editExpenseIndex = index;
    this.isExpenseModalOpen = true;
  }

  closeExpenseModal() {
    this.isExpenseModalOpen = false;
    this.editExpenseIndex = null;
    this.expenseForm.reset();
  }

  submitExpense() {
    if (this.expenseForm.valid) {
      const expense = this.expenseForm.getRawValue();
      if (this.editExpenseIndex !== null) {
        // Update existing expense
        this.expenses[this.editExpenseIndex] = expense;
        this.editExpenseIndex = null;
      } else {
        // Add new expense
        this.expenses.push(expense);
      }
      this.expenseForm.reset();
      this.selectedFileName = null;
      this.selectedFile = null;
      this.closeExpenseModal();
    }
  }

  onFileSelected(file: File): void {
    this.selectedFile = file;
    this.selectedFileName = file.name;
  }

  removeFile(): void {
    this.selectedFile = null;
    this.selectedFileName = null;
  }

  onSubmitForm(): void {
    if (this.travelAuthForm.valid) {
      this.isSubmitting.set(true);
      // TODO: Replace with actual API call
      // Simulate API call
      setTimeout(() => {
        this.isSubmitting.set(false);
        // Handle success/redirect
      }, 1500);
    }
  }
}
