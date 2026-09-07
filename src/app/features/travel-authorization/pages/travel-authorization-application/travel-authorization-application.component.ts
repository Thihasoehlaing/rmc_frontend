import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormArray,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormControl,
  ValidatorFn,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DropdownOption } from '../../../../core/interfaces/components.interface';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { FormWizardNavComponent } from '../../../../shared/components/form-wizard-nav/form-wizard-nav.component';
import { ReviewBlockComponent } from '../../../rdig/components/review-block/review-block.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import {
  FormMainTitleComponent,
  GuidelineContext,
} from '../../../../shared/components/form-main-title/form-main-title.component';
import { ActivatedRoute } from '@angular/router';
import { StaffDirectoryService, StaffRecord } from '../../../settings/staff-directory/staff-directory.service';
import { ActionLoadingService } from '../../../../core/services/action-loading.service';
import { DecimalAmountDirective } from '../../../../shared/directives/decimal-amount.directive';
import { MyrCurrencyPipe } from '../../../../shared/pipes/myr-currency.pipe';

import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';

interface FunctionalAreaOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-travel-authorization-application',
  standalone: true,
  imports: [
    TableActionIconComponent,
    CommonModule,
    SearchableDropdownComponent,
    ReactiveFormsModule,
    ValidationMessageComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    CharacterCounterComponent,
    NoteComponent,
    DialogComponent,
    FileUploadComponent,
    FormWizardNavComponent,
    ReviewBlockComponent,
    DataTableComponent,
    FormMainTitleComponent,
    DecimalAmountDirective,
    MyrCurrencyPipe,
  ],
  templateUrl: './travel-authorization-application.component.html',
  styleUrl: './travel-authorization-application.component.scss',
})
export class TravelAuthorizationApplicationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private readonly staffDirectoryService = inject(StaffDirectoryService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly actionLoading = inject(ActionLoadingService);
  readonly guidelineContext: GuidelineContext = this.route.snapshot.queryParamMap.has('id')
    ? 'existing-application'
    : 'new-application';

  travelAuthForm!: FormGroup;
  expenseForm!: FormGroup;
  expenses: any[] = [];
  isExpenseModalOpen = false;
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  editExpenseIndex: number | null = null;
  isSubmitting = signal(false);
  readonly colleagueOptions = signal<DropdownOption<number>[]>([]);
  readonly isColleagueLoading = signal(false);

  readonly activityColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: '60px', align: 'center' },
    { key: 'date', label: 'Date', width: '160px' },
    { key: 'time', label: 'Time', width: '140px' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' },
  ];

  // Comment visibility toggles for all 7 roles
  showHosComments = signal(false);
  showRmcComments = signal(false);
  showVcComments = signal(false);
  showHrComments = signal(false);
  showCeoComments = signal(false);
  showFinanceComments = signal(false);
  showCooComments = signal(false);

  // Computed signal to check if any comments are visible
  showAnyComments = computed(
    () =>
      (this.showHosToggle() && this.getHosCommentState().visible) ||
      (this.showRmcToggle() && this.getRmcCommentState().visible) ||
      (this.showVcToggle() && this.getVcCommentState().visible) ||
      (this.showHrToggle() && this.getHrCommentState().visible) ||
      (this.showCeoToggle() && this.getCeoCommentState().visible) ||
      (this.showFinanceToggle() && this.getFinanceCommentState().visible) ||
      (this.showCooToggle() && this.getCooCommentState().visible),
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
    { key: 'actions', label: 'Actions', width: '100px', align: 'center' },
  ];

  ngOnInit() {
    this.initializeForm();
    this.initializeExpenseForm();
    this.loadColleagueOptions();
    this.setupConditionalFieldHandlers();
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
      this.syncConditionalFieldStates();
    }
  }

  // Toggle methods for comment visibility
  toggleHosComments(): void {
    this.showHosComments.update((val) => !val);
  }

  toggleRmcComments(): void {
    this.showRmcComments.update((val) => !val);
  }

  toggleVcComments(): void {
    this.showVcComments.update((val) => !val);
  }

  toggleHrComments(): void {
    this.showHrComments.update((val) => !val);
  }

  toggleCeoComments(): void {
    this.showCeoComments.update((val) => !val);
  }

  toggleFinanceComments(): void {
    this.showFinanceComments.update((val) => !val);
  }

  toggleCooComments(): void {
    this.showCooComments.update((val) => !val);
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
    return ['pending_finance', 'finance_reject', 'pending_coo', 'coo_reject', 'approved'].includes(
      status,
    );
  }

  /**
   * Workflow Logic: Show COO toggle button when status allows
   */
  showCooToggle(): boolean {
    const status = this.travelStatus();
    return ['pending_coo', 'coo_reject', 'approved'].includes(status);
  }

  /**
   * Workflow Logic: Auto-show and control editability for HOS comments based on status
   */
  getHosCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible =
      ['applicant_resub', 'pending_rmc', 'rmc_reject', 'hos_reject', 'approved'].includes(status) ||
      this.showHosComments();
    const editable = status === 'pending_hos';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for RMC comments based on status
   */
  getRmcCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible =
      [
        'applicant_resub',
        'hos_resub',
        'hos_request_resubmission',
        'rmc_request_resubmission',
        'pending_rmc',
        'rmc_reject',
        'approved',
      ].includes(status) || this.showRmcComments();
    const editable = status === 'pending_rmc';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for VC comments based on status
   */
  getVcCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible =
      ['pending_vc', 'vc_reject', 'approved'].includes(status) || this.showVcComments();
    const editable = status === 'pending_vc';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for HR comments based on status
   */
  getHrCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible =
      ['pending_hr', 'hr_reject', 'approved'].includes(status) || this.showHrComments();
    const editable = status === 'pending_hr';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for CEO comments based on status
   */
  getCeoCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible =
      ['pending_ceo', 'ceo_reject', 'approved'].includes(status) || this.showCeoComments();
    const editable = status === 'pending_ceo';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for Finance comments based on status
   */
  getFinanceCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible =
      ['pending_finance', 'finance_reject', 'approved'].includes(status) ||
      this.showFinanceComments();
    const editable = status === 'pending_finance';
    return { visible, editable };
  }

  /**
   * Workflow Logic: Auto-show and control editability for COO comments based on status
   */
  getCooCommentState(): { visible: boolean; editable: boolean } {
    const status = this.travelStatus();
    const visible =
      ['pending_coo', 'coo_reject', 'approved'].includes(status) || this.showCooComments();
    const editable = status === 'pending_coo';
    return { visible, editable };
  }

  /**
   * Helper method to get form controls
   */
  fc(path: string): FormControl {
    return this.travelAuthForm.get(path) as FormControl;
  }

  get activityRows(): FormArray {
    return this.travelAuthForm.get('activities') as FormArray;
  }

  private initializeExpenseForm() {
    this.expenseForm = this.fb.group({
      accountCode: ['', [Validators.required]],
      typeOfExpense: ['', [Validators.required]],
      description: [''],
      amountForeignCurrency: [
        '',
        [Validators.required, Validators.pattern('^[0-9]+(?:\\.[0-9]+)?$')],
      ],
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
      activities: this.fb.array([]),
      bookingDoneBy: ['', [Validators.required]],
      bookingDoneByOther: ['', [Validators.maxLength(300)]],
      isAdvanceRequired: ['no', [Validators.required]],
      advanceReason: [{ value: '', disabled: true }, [Validators.maxLength(300)]],
      hasColleagues: ['no', [Validators.required]],
      colleagues: [{ value: [], disabled: true }, [Validators.required, Validators.maxLength(10)]],
      staffParticipation: [[], [Validators.required]],
      programmeLocation: ['', [Validators.required]],
      declarationInformationTrue: [false, Validators.requiredTrue],
      declarationDisciplinaryAction: [false, Validators.requiredTrue],
      declarationTermsUnderstood: [false, Validators.requiredTrue],
      declarationInformationCorrect: [false, Validators.requiredTrue],
      // Review comments group for all 7 roles
      reviewComments: this.fb.group({
        hosComment: ['', [Validators.maxLength(1000)]],
        rmcComment: ['', [Validators.maxLength(1000)]],
        vcComment: ['', [Validators.maxLength(1000)]],
        hrComment: ['', [Validators.maxLength(1000)]],
        ceoComment: ['', [Validators.maxLength(1000)]],
        financeComment: ['', [Validators.maxLength(1000)]],
        cooComment: ['', [Validators.maxLength(1000)]],
      }),
    });

    this.activityRows.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateActivityDateValidators());

    this.travelAuthForm
      .get('departureDate')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateActivityDateValidators());

    this.travelAuthForm
      .get('returnDate')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateActivityDateValidators());
  }

  private setupConditionalFieldHandlers(): void {
    this.travelAuthForm
      .get('bookingDoneBy')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncConditionalFieldStates());

    this.travelAuthForm
      .get('isAdvanceRequired')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncConditionalFieldStates());

    this.travelAuthForm
      .get('hasColleagues')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncConditionalFieldStates());

    this.syncConditionalFieldStates();
  }

  private syncConditionalFieldStates(): void {
    if (!this.travelAuthForm || this.isFormReadOnly()) {
      return;
    }

    const bookingDoneBy = this.travelAuthForm.get('bookingDoneBy')?.value;
    const bookingDoneByOther = this.travelAuthForm.get('bookingDoneByOther');
    if (bookingDoneBy === 'other') {
      bookingDoneByOther?.setValidators([Validators.required, Validators.maxLength(300)]);
    } else {
      bookingDoneByOther?.setValidators([Validators.maxLength(300)]);
      bookingDoneByOther?.reset('', { emitEvent: false });
    }
    bookingDoneByOther?.updateValueAndValidity({ emitEvent: false });

    const isAdvanceRequired = this.travelAuthForm.get('isAdvanceRequired')?.value;
    const advanceReason = this.travelAuthForm.get('advanceReason');
    if (isAdvanceRequired === 'yes') {
      advanceReason?.setValidators([Validators.required, Validators.maxLength(300)]);
      advanceReason?.enable({ emitEvent: false });
    } else {
      advanceReason?.setValidators([Validators.maxLength(300)]);
      advanceReason?.reset('', { emitEvent: false });
      advanceReason?.disable({ emitEvent: false });
    }
    advanceReason?.updateValueAndValidity({ emitEvent: false });

    const hasColleagues = this.travelAuthForm.get('hasColleagues')?.value;
    const colleagues = this.travelAuthForm.get('colleagues');
    if (hasColleagues === 'yes') {
      colleagues?.enable({ emitEvent: false });
    } else {
      colleagues?.reset([], { emitEvent: false });
      colleagues?.disable({ emitEvent: false });
    }
  }

  private loadColleagueOptions(): void {
    if (!this.staffDirectoryService) {
      this.isColleagueLoading.set(false);
      return;
    }

    this.isColleagueLoading.set(true);

    this.staffDirectoryService
      .list({ page: 1, perPage: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const options = (response.data.items ?? [])
            .filter((staff) => staff.is_active)
            .map((staff) => this.toColleagueOption(staff))
            .sort((left, right) => left.label.localeCompare(right.label));

          this.colleagueOptions.set(options);
          this.isColleagueLoading.set(false);
        },
        error: () => {
          this.colleagueOptions.set([]);
          this.isColleagueLoading.set(false);
        },
      });
  }

  private toColleagueOption(staff: StaffRecord): DropdownOption<number> {
    const label =
      staff.fullname?.trim() || staff.label?.trim() || staff.email?.trim() || staff.username;

    return {
      value: staff.id,
      label,
      displayLabel: staff.staff_code || staff.email || staff.department || undefined,
    };
  }

  private updateActivityDateValidators(): void {
    if (!this.activityRows.length) {
      return;
    }

    for (const row of this.activityRows.controls) {
      row.get('date')?.updateValueAndValidity({ emitEvent: false });
    }

    this.activityRows.updateValueAndValidity({ emitEvent: false });
  }

  private activityDateWithinTravelRangeValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const activityDate = String(control.value ?? '').trim();
      const departureDate = String(this.travelAuthForm?.get('departureDate')?.value ?? '').trim();
      const returnDate = String(this.travelAuthForm?.get('returnDate')?.value ?? '').trim();

      if (!activityDate || !departureDate || !returnDate) {
        return null;
      }

      if (activityDate < departureDate || activityDate > returnDate) {
        return { activityDateRange: true };
      }

      return null;
    };
  }

  private createActivityRow(): FormGroup {
    return this.fb.group({
      date: ['', [Validators.required, this.activityDateWithinTravelRangeValidator()]],
      time: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.maxLength(300)]],
    });
  }

  addActivityRow(): void {
    this.activityRows.push(this.createActivityRow());
    this.activityRows.updateValueAndValidity({ emitEvent: false });
  }

  removeActivityRow(index: number): void {
    this.activityRows.removeAt(index);
    this.activityRows.updateValueAndValidity({ emitEvent: false });
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

  restrictDecimalInput(
    event: KeyboardEvent,
    controlName: 'amountForeignCurrency' | 'exchangeRate',
  ): void {
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

    if (
      (event.ctrlKey || event.metaKey) &&
      ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase())
    ) {
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
      const loadingId = this.actionLoading.begin('Submitting travel authorization application');
      // TODO: Replace with actual API call
      // Simulate API call
      setTimeout(() => {
        this.isSubmitting.set(false);
        this.actionLoading.end(loadingId);
        // Handle success/redirect
      }, 1500);
    }
  }
}
