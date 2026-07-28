import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  firstValueFrom,
  forkJoin,
  map,
  merge,
  Observable,
  of,
  switchMap,
  timer,
} from 'rxjs';
import { CustomSubheaderComponent } from '../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../shared/components/character-counter/character-counter.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../shared/components/data-table/data-table.component';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button.component';
import { SearchableDropdownComponent } from '../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { DropdownOption } from '../../core/interfaces/components.interface';
import { ActionLoadingService } from '../../core/services/action-loading.service';
import { ToastService } from '../../core/services/toast.service';
import { DecimalAmountDirective } from '../../shared/directives/decimal-amount.directive';
import { ValidationMessageComponent } from '../../shared/components/validation-message/validation-message.component';

import { TableActionIconComponent } from '../../shared/components/table-action-icon/table-action-icon.component';
import {
  BudgetItemPayload,
  BudgetSectionPayload,
  ExternalGrantCategory,
  ExternalProjectApiService,
  ExternalProjectFormData,
  ExternalProjectPayload,
  StaffOption,
} from './external-project-api.service';

type TableEntryType = 'internal' | 'external' | 'outcome' | 'budget' | 'billing';

interface InternalCoResearcherRow {
  staffName: string;
  schoolDepartment: string;
}

interface StaffMember {
  name: string;
  schoolDepartment: string;
  username: string;
  email: string;
}

interface BudgetBreakdownRow {
  description: string;
  amount: string;
}

interface BillingBreakdownRow {
  description: string;
  amount: string;
}

interface BudgetSection {
  key: string;
  title: string;
  code: string;
  item: string;
  totalAmount: string;
  rows: BudgetBreakdownRow[];
  billingRequired: 'Yes' | 'No' | '';
  billingAmount: string;
  billingDate: string;
  billingRows: BillingBreakdownRow[];
  remark: string;
}

interface ExternalCollaboratorRow {
  name: string;
  affiliation: string;
}

interface ExpectedOutcomeRow {
  description: string;
}

@Component({
  selector: 'app-external-project-data-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableActionIconComponent,
    CommonModule,
    ReactiveFormsModule,
    CustomSubheaderComponent,
    CharacterCounterComponent,
    DataTableComponent,
    ActionButtonComponent,
    SearchableDropdownComponent,
    DialogComponent,
    DecimalAmountDirective,
    ValidationMessageComponent,
  ],
  templateUrl: './external-project-data-entry.component.html',
  styleUrls: ['./external-project-data-entry.component.scss'],
})
export class ExternalProjectDataEntryComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly externalProjectApi = inject(ExternalProjectApiService);
  private readonly actionLoading = inject(ActionLoadingService);
  private readonly toast = inject(ToastService);
  private requestId =
    Number(
      this.route.snapshot.queryParamMap.get('id') ??
        this.route.snapshot.queryParamMap.get('request_id'),
    ) || null;
  readonly isAdminEditMode =
    this.requestId != null &&
    this.route.snapshot.queryParamMap.get('admin_edit')?.toLowerCase() === 'true';
  private readonly grantCategoryByName = new Map<string, ExternalGrantCategory>();
  private readonly grantCategoryById = new Map<number, ExternalGrantCategory>();

  readonly externalProjectForm = this.fb.group({
    externalGrantCategory: [''],
    projectAccountCode: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(255)],
      asyncValidators: [this.projectAccountCodeAvailabilityValidator()],
    }),
    referenceCode: [''],
    description: [''],
    staffName: [''],
    schoolDepartment: [''],
    sponsorName: [''],
    grantName: [''],
    startDate: [''],
    endDate: [''],
    durationMonths: [''],
    researchTitle: [''],
    totalBudgetRequest: [''],
    clientStakeholder: [''],
    consultancyTitle: [''],
  });

  readonly tableEntryForm = this.fb.group({
    staffName: [''],
    schoolDepartment: [''],
    name: [''],
    affiliation: [''],
    description: [''],
    amount: [''],
  });

  protected grantCategories: string[] = [];
  private staffDirectory: StaffMember[] = [];
  projectLeaderOptions: DropdownOption<string>[] = [];

  readonly internalCoResearcherColumns: readonly DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'staffName', label: 'Staff Name' },
    { key: 'schoolDepartment', label: 'School/Department' },
    {
      key: 'actions',
      label: 'Action',
      width: 'var(--size-table-column-actions)',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  readonly externalCollaboratorColumns: readonly DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'name', label: 'Name' },
    { key: 'affiliation', label: 'Affiliation' },
    {
      key: 'actions',
      label: 'Action',
      width: 'var(--size-table-column-actions)',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  readonly expectedOutcomeColumns: readonly DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'description', label: 'Description' },
    {
      key: 'actions',
      label: 'Action',
      width: 'var(--size-table-column-actions)',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  readonly budgetBreakdownColumns: readonly DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'description', label: 'Description of Expense' },
    { key: 'amount', label: 'Amount (RM)', width: 'var(--size-table-column-amount)' },
    {
      key: 'actions',
      label: 'Action',
      width: 'var(--size-table-column-actions)',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  readonly billingBreakdownColumns: readonly DataTableColumn[] = [
    {
      key: 'index',
      label: '#',
      width: 'var(--size-table-column-index)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount (RM)', width: 'var(--size-table-column-amount)' },
    {
      key: 'actions',
      label: 'Action',
      width: 'var(--size-table-column-actions)',
      align: 'right',
      headerAlign: 'right',
    },
  ];

  internalCoResearchers: InternalCoResearcherRow[] = [];
  externalCollaborators: ExternalCollaboratorRow[] = [];
  expectedOutcomes: ExpectedOutcomeRow[] = [];
  completeAttempted = false;
  isOptionsLoading = false;
  isSaving = false;
  isSubmitting = false;
  loadError: string | null = null;
  actionError: string | null = null;
  tableEntryDialogOpen = false;
  activeTableEntryType: TableEntryType | null = null;
  activeSectionKey: string | null = null;
  editingTableRowIndex: number | null = null;

  readonly budgetSections: BudgetSection[] = [
    this.createBudgetSection('student-allowances', 'Student Allowances', 'V11000'),
    this.createBudgetSection('travel-accommodation', 'Travelling and Accommodation', 'V21000'),
    this.createBudgetSection('rental', 'Rental', 'V24000'),
    this.createBudgetSection('materials-supplies', 'Research Materials and Supplies', 'V27000'),
    this.createBudgetSection('maintenance-repair', 'Maintenance & Minor Repair Services', 'V28000'),
    this.createBudgetSection('special-services', 'Special Services', 'V29000'),
    this.createBudgetSection('accessories-equipment', 'Accessories & Equipment', 'V35000'),
    this.createBudgetSection('management-fee', 'Management Fee', 'V40000', true),
  ];

  constructor() {
    this.loadOptionsAndInitialForm();

    merge(
      this.externalProjectForm.controls.startDate.valueChanges,
      this.externalProjectForm.controls.endDate.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateProjectDuration());

    this.externalProjectForm.controls.staffName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((staffName) => {
        this.externalProjectForm.controls.schoolDepartment.setValue(
          this.getStaffDepartment(staffName),
          { emitEvent: false },
        );
      });

    this.tableEntryForm.controls.staffName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((staffName) => {
        this.tableEntryForm.controls.schoolDepartment.setValue(this.getStaffDepartment(staffName), {
          emitEvent: false,
        });
      });
  }

  private loadOptionsAndInitialForm(): void {
    this.isOptionsLoading = true;
    this.loadError = null;

    const emptyGrantCategoriesResponse = {
      success: false,
      message: '',
      data: [] as ExternalGrantCategory[],
    };
    const emptyStaffResponse = {
      success: false,
      message: '',
      data: [] as StaffOption[],
    };

    forkJoin({
      categories: this.externalProjectApi
        .listGrantCategories()
        .pipe(catchError(() => of(emptyGrantCategoriesResponse))),
      staff: this.externalProjectApi
        .listStaffOptions()
        .pipe(catchError(() => of(emptyStaffResponse))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ categories, staff }) => {
          this.applyGrantCategories(categories.data || []);
          this.applyStaffOptions(staff.data || []);
          this.isOptionsLoading = false;
          this.loadError = this.buildOptionsLoadMessage(categories.success, staff.success);
          this.loadExistingFormIfNeeded();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isOptionsLoading = false;
          this.loadError = 'Some form options could not be loaded. Please refresh and try again.';
          this.loadExistingFormIfNeeded();
          this.cdr.markForCheck();
        },
      });
  }

  private loadExistingFormIfNeeded(): void {
    if (this.requestId) {
      void this.loadExistingForm(this.requestId);
    }
  }

  private async loadExistingForm(requestId: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.externalProjectApi.getForm(requestId));
      this.hydrateFromApi(response.data);
      this.actionError = null;
    } catch (error) {
      this.actionError = this.extractErrorMessage(
        error,
        this.isAdminEditMode
          ? 'Unable to load this external project.'
          : 'Unable to load this external project draft.',
      );
    } finally {
      this.cdr.markForCheck();
    }
  }

  private applyGrantCategories(categories: ExternalGrantCategory[]): void {
    this.grantCategoryByName.clear();
    this.grantCategoryById.clear();
    const activeCategories = categories.filter((category) => category.is_active !== false);
    activeCategories.forEach((category) => {
      this.grantCategoryByName.set(category.name, category);
      this.grantCategoryById.set(category.id, category);
    });
    this.grantCategories = activeCategories.map((category) => category.name);
  }

  private applyStaffOptions(staffOptions: StaffOption[]): void {
    this.staffDirectory = staffOptions
      .map((staff) => {
        const name = staff.fullname?.trim() || staff.username?.trim() || '';

        return {
          name,
          username: staff.username?.trim() || '',
          email: staff.email?.trim() || '',
          schoolDepartment: staff.department?.trim() || '',
        };
      })
      .filter((staff) => staff.name);

    this.projectLeaderOptions = this.staffDirectory.map((staff) => {
      const description = [staff.username, staff.email, staff.schoolDepartment]
        .filter(Boolean)
        .join(' • ');

      return {
        value: staff.name,
        label: staff.name,
        description,
        searchText: [staff.name, staff.username, staff.email, staff.schoolDepartment]
          .filter(Boolean)
          .join(' '),
      };
    });
  }

  private buildOptionsLoadMessage(categoriesLoaded: boolean, staffLoaded: boolean): string | null {
    if (categoriesLoaded && staffLoaded) {
      return null;
    }

    if (!categoriesLoaded && !staffLoaded) {
      return 'Grant categories and staff options could not be loaded. Please refresh and try again.';
    }

    if (!categoriesLoaded) {
      return 'Grant categories could not be loaded. Please refresh and try again.';
    }

    return 'Staff options could not be loaded. Please refresh and try again.';
  }

  isNationalSelected(): boolean {
    return this.externalProjectForm.get('externalGrantCategory')?.value === 'National';
  }

  isInternationalSelected(): boolean {
    return this.externalProjectForm.get('externalGrantCategory')?.value === 'International';
  }

  isPrivateIndustrySelected(): boolean {
    return this.externalProjectForm.get('externalGrantCategory')?.value === 'Private (Industry)';
  }

  isConsultancySelected(): boolean {
    return this.selectedGrantCategoryName() === 'consultancy';
  }

  showProjectFlow(): boolean {
    const selectedCategory = this.selectedGrantCategoryName();
    return !!selectedCategory && selectedCategory !== 'consultancy';
  }

  researchTitleLength(): number {
    return this.externalProjectForm.get('researchTitle')?.value?.length ?? 0;
  }

  consultancyTitleLength(): number {
    return this.externalProjectForm.get('consultancyTitle')?.value?.length ?? 0;
  }

  minimumEndDate(): string {
    return this.externalProjectForm.controls.startDate.value ?? '';
  }

  private updateProjectDuration(): void {
    const startDate = this.parseDate(this.externalProjectForm.controls.startDate.value);
    const endDate = this.parseDate(this.externalProjectForm.controls.endDate.value);
    const endDateControl = this.externalProjectForm.controls.endDate;
    const durationControl = this.externalProjectForm.controls.durationMonths;

    if (startDate && endDate && endDate.timestamp < startDate.timestamp) {
      endDateControl.setValue('', { emitEvent: false });
      durationControl.setValue('', { emitEvent: false });
      return;
    }

    if (!startDate || !endDate) {
      durationControl.setValue('', { emitEvent: false });
      return;
    }

    const calendarMonthDifference =
      (endDate.year - startDate.year) * 12 + endDate.month - startDate.month;
    const includesPartialMonth = endDate.day > startDate.day;
    const durationMonths = Math.max(1, calendarMonthDifference + (includesPartialMonth ? 1 : 0));

    durationControl.setValue(String(durationMonths), { emitEvent: false });
  }

  openTableEntryDialog(
    type: TableEntryType,
    sectionKey: string | null = null,
    index: number | null = null,
  ): void {
    this.activeTableEntryType = type;
    this.activeSectionKey = sectionKey;
    this.editingTableRowIndex = index;
    this.configureTableEntryValidation(type);
    this.tableEntryForm.reset(this.getTableEntryValue(type, sectionKey, index));
    this.tableEntryDialogOpen = true;
  }

  closeTableEntryDialog(): void {
    this.tableEntryDialogOpen = false;
    this.activeTableEntryType = null;
    this.activeSectionKey = null;
    this.editingTableRowIndex = null;
    this.tableEntryForm.reset();
  }

  tableEntryDialogTitle(): string {
    const action = this.editingTableRowIndex === null ? 'Add' : 'Edit';
    const labels: Record<TableEntryType, string> = {
      internal: 'Internal Co-Researcher',
      external: 'External Collaborator',
      outcome: 'Expected Outcome',
      budget: 'Budget Item',
      billing: 'Billing Item',
    };
    return this.activeTableEntryType ? `${action} ${labels[this.activeTableEntryType]}` : '';
  }

  submitTableEntry(): void {
    if (!this.activeTableEntryType) {
      return;
    }

    if (this.tableEntryForm.invalid) {
      this.tableEntryForm.markAllAsTouched();
      return;
    }

    const value = this.tableEntryForm.getRawValue();
    const index = this.editingTableRowIndex;

    switch (this.activeTableEntryType) {
      case 'internal':
        this.internalCoResearchers = this.upsertRow(
          this.internalCoResearchers,
          { staffName: value.staffName ?? '', schoolDepartment: value.schoolDepartment ?? '' },
          index,
        );
        break;
      case 'external':
        this.externalCollaborators = this.upsertRow(
          this.externalCollaborators,
          { name: value.name ?? '', affiliation: value.affiliation ?? '' },
          index,
        );
        break;
      case 'outcome':
        this.expectedOutcomes = this.upsertRow(
          this.expectedOutcomes,
          { description: value.description ?? '' },
          index,
        );
        break;
      case 'budget':
        this.updateBudgetSection(this.activeSectionKey ?? '', (section) => {
          section.rows = this.upsertRow(
            section.rows,
            { description: value.description ?? '', amount: value.amount ?? '' },
            index,
          );
          this.recalculateBudgetSectionTotal(section);
        });
        break;
      case 'billing':
        this.updateBudgetSection(this.activeSectionKey ?? '', (section) => {
          section.billingRows = this.upsertRow(
            section.billingRows,
            { description: value.description ?? '', amount: value.amount ?? '' },
            index,
          );
        });
        break;
    }

    this.closeTableEntryDialog();
  }

  updateBudgetSectionItem(sectionKey: string, value: string): void {
    this.budgetSections.forEach((section) => {
      if (section.key === sectionKey) {
        section.item = value;
      }
    });
  }

  updateBudgetSectionTotal(sectionKey: string, value: string): void {
    this.budgetSections.forEach((section) => {
      if (section.key === sectionKey) {
        section.totalAmount = value;
      }
    });
  }

  updateBudgetSectionRemark(sectionKey: string, value: string): void {
    this.budgetSections.forEach((section) => {
      if (section.key === sectionKey) {
        section.remark = value;
      }
    });
  }

  updateBillingRequired(sectionKey: string, value: 'Yes' | 'No'): void {
    this.budgetSections.forEach((section) => {
      if (section.key === sectionKey) {
        section.billingRequired = value;
        if (value === 'No') {
          section.billingAmount = '';
          section.billingDate = '';
          section.billingRows = [];
        }
      }
    });
  }

  updateBillingAmount(sectionKey: string, value: string): void {
    this.updateBudgetSection(sectionKey, (section) => {
      section.billingAmount = value.replaceAll(',', '');
    });
  }

  updateBillingDate(sectionKey: string, value: string): void {
    this.updateBudgetSection(sectionKey, (section) => {
      section.billingDate = value;
    });
  }

  isBillingFieldInvalid(section: BudgetSection, field: 'amount' | 'date'): boolean {
    if (!this.completeAttempted || section.billingRequired !== 'Yes') {
      return false;
    }

    return field === 'amount' ? this.parseAmount(section.billingAmount) <= 0 : !section.billingDate;
  }

  isBillingBreakdownInvalid(section: BudgetSection): boolean {
    if (!this.completeAttempted || section.billingRequired !== 'Yes') {
      return false;
    }

    return !section.billingRows.some(
      (row) => row.description.trim().length > 0 && this.parseAmount(row.amount) > 0,
    );
  }

  budgetSummaryTotal(): string {
    const total = this.budgetSections.reduce(
      (sum, section) => sum + this.parseAmount(section.totalAmount),
      0,
    );
    return total ? total.toFixed(2) : '0.00';
  }

  removeInternalCoResearcherRow(index: number): void {
    this.internalCoResearchers = this.internalCoResearchers.filter(
      (_, rowIndex) => rowIndex !== index,
    );
  }

  removeExternalCollaboratorRow(index: number): void {
    this.externalCollaborators = this.externalCollaborators.filter(
      (_, rowIndex) => rowIndex !== index,
    );
  }

  removeExpectedOutcomeRow(index: number): void {
    this.expectedOutcomes = this.expectedOutcomes.filter((_, rowIndex) => rowIndex !== index);
  }

  removeBudgetRow(sectionKey: string, index: number): void {
    this.updateBudgetSection(sectionKey, (section) => {
      section.rows = section.rows.filter((_, rowIndex) => rowIndex !== index);
      this.recalculateBudgetSectionTotal(section);
    });
  }

  removeBillingRow(sectionKey: string, index: number): void {
    this.updateBudgetSection(sectionKey, (section) => {
      section.billingRows = section.billingRows.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackBudgetSection(index: number, section: BudgetSection): string {
    return section.key;
  }

  async saveDraft(): Promise<void> {
    if (
      this.isSaving ||
      this.isSubmitting ||
      this.isOptionsLoading ||
      this.isProjectAccountCodeValidationPending()
    ) {
      return;
    }

    if (this.hasProjectAccountCodeConflict()) {
      this.externalProjectForm.controls.projectAccountCode.markAsTouched();
      this.actionError = 'Project account code already exists.';
      return;
    }

    this.isSaving = true;
    this.actionError = null;
    const loadingId = this.actionLoading.begin(
      this.isAdminEditMode ? 'Saving external project changes' : 'Saving external project draft',
    );

    try {
      await this.saveDraftToBackend();
      this.externalProjectForm.markAsPristine();
      this.toast.success(
        this.isAdminEditMode
          ? 'External form edited successfully.'
          : 'External form saved as draft successfully.',
      );
    } catch (error) {
      this.actionError = this.extractErrorMessage(
        error,
        this.isAdminEditMode
          ? 'Unable to save external project changes.'
          : 'Unable to save external project draft.',
      );
    } finally {
      this.isSaving = false;
      this.actionLoading.end(loadingId);
      this.cdr.markForCheck();
    }
  }

  async complete(): Promise<void> {
    if (this.isSaving || this.isSubmitting || this.isOptionsLoading) {
      return;
    }

    this.completeAttempted = true;
    this.externalProjectForm.markAllAsTouched();
    if (this.hasProjectAccountCodeConflict()) {
      this.actionError = 'Project account code already exists.';
      return;
    }
    if (this.externalProjectForm.invalid || !this.selectedGrantCategoryId()) {
      this.actionError = 'Please complete the required external project fields before submitting.';
      return;
    }

    this.isSubmitting = true;
    this.actionError = null;
    const loadingId = this.actionLoading.begin('Submitting external project');

    try {
      const requestId = await this.saveDraftToBackend();
      const response = await firstValueFrom(this.externalProjectApi.submit(requestId));
      this.hydrateFromApi(response.data);
      this.toast.success('External form submitted successfully.');
      const requestCode = response.data.request?.request_code;
      if (requestCode) {
        await this.router.navigate(['/external-project-data-entry/detail', String(requestCode)]);
      }
    } catch (error) {
      this.actionError = this.extractErrorMessage(error, 'Unable to submit external project.');
    } finally {
      this.isSubmitting = false;
      this.actionLoading.end(loadingId);
      this.cdr.markForCheck();
    }
  }

  private async saveDraftToBackend(): Promise<number> {
    const payload = this.buildExternalProjectPayload();
    const requestId = await this.ensureDraftRequest(payload);

    await firstValueFrom(this.externalProjectApi.updateDraft(requestId, payload));
    await this.replaceChildRows(requestId);

    const refreshed = await firstValueFrom(this.externalProjectApi.getForm(requestId));
    this.hydrateFromApi(refreshed.data);
    return requestId;
  }

  private async ensureDraftRequest(payload: ExternalProjectPayload): Promise<number> {
    if (this.requestId) {
      return this.requestId;
    }

    const response = await firstValueFrom(this.externalProjectApi.createDraft(payload));
    const requestId = Number(response.data.request?.id ?? response.data.request?.request_id);
    this.requestId = requestId;
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: requestId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    return requestId;
  }

  private buildExternalProjectPayload(): ExternalProjectPayload {
    const value = this.externalProjectForm.getRawValue();
    const categoryId = this.selectedGrantCategoryId();
    const payload: ExternalProjectPayload = {
      project_account_code: this.clean(value.projectAccountCode),
      reference_code: this.clean(value.referenceCode),
      description: this.clean(value.description),
      staff_name: this.clean(value.staffName),
      school_department: this.clean(value.schoolDepartment),
      sponsor_name: this.clean(value.sponsorName),
      grant_name: this.clean(value.grantName),
      client_stakeholder: this.clean(value.clientStakeholder),
      start_date: this.clean(value.startDate),
      end_date: this.clean(value.endDate),
      duration_months: this.toInteger(value.durationMonths),
      research_title: this.clean(value.researchTitle),
      consultancy_title: this.clean(value.consultancyTitle),
      total_budget_request: this.budgetSummaryTotal(),
      remark: this.clean(
        this.budgetSections.find((section) => section.key === 'management-fee')?.remark,
      ),
      is_billing_required: this.budgetSections.some((section) => section.billingRequired === 'Yes'),
    };
    if (categoryId !== null) {
      payload.external_grant_category_id = categoryId;
    }
    if (!payload.staff_name) {
      delete payload.staff_name;
    }
    return payload;
  }

  hasProjectAccountCodeConflict(): boolean {
    return this.externalProjectForm.controls.projectAccountCode.hasError(
      'projectAccountCodeExists',
    );
  }

  isProjectAccountCodeValidationPending(): boolean {
    return this.externalProjectForm.controls.projectAccountCode.pending;
  }

  private projectAccountCodeAvailabilityValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const code = String(control.value ?? '').trim();
      if (!code) {
        return of(null);
      }

      return timer(350).pipe(
        switchMap(() =>
          this.externalProjectApi.checkProjectAccountCodeAvailability(code, this.requestId),
        ),
        map((response) => (response.data.available ? null : { projectAccountCodeExists: true })),
        catchError(() => of(null)),
      );
    };
  }

  private async replaceChildRows(requestId: number): Promise<void> {
    const existing = await firstValueFrom(this.externalProjectApi.getForm(requestId));
    const data = existing.data;

    for (const item of data.billing_items || []) {
      await firstValueFrom(this.externalProjectApi.deleteBillingItem(requestId, item.id));
    }
    if (data.billing) {
      await firstValueFrom(this.externalProjectApi.deleteBilling(requestId));
    }
    for (const item of data.budget_items || []) {
      await firstValueFrom(this.externalProjectApi.deleteBudgetItem(requestId, item.id));
    }
    for (const item of data.budget_sections || []) {
      await firstValueFrom(this.externalProjectApi.deleteBudgetSection(requestId, item.id));
    }
    for (const item of data.internal_co_researchers || []) {
      await firstValueFrom(this.externalProjectApi.deleteInternalCoResearcher(requestId, item.id));
    }
    for (const item of data.external_collaborators || []) {
      await firstValueFrom(this.externalProjectApi.deleteExternalCollaborator(requestId, item.id));
    }
    for (const item of data.expected_outcomes || []) {
      await firstValueFrom(this.externalProjectApi.deleteExpectedOutcome(requestId, item.id));
    }

    for (const [index, row] of this.internalCoResearchers.entries()) {
      await firstValueFrom(
        this.externalProjectApi.createInternalCoResearcher(requestId, {
          staff_name: row.staffName,
          school_department: this.clean(row.schoolDepartment),
          display_order: index + 1,
        }),
      );
    }
    for (const [index, row] of this.externalCollaborators.entries()) {
      await firstValueFrom(
        this.externalProjectApi.createExternalCollaborator(requestId, {
          full_name: row.name,
          affiliation: this.clean(row.affiliation),
          display_order: index + 1,
        }),
      );
    }
    for (const [index, row] of this.expectedOutcomes.entries()) {
      await firstValueFrom(
        this.externalProjectApi.createExpectedOutcome(requestId, {
          description: this.clean(row.description),
          display_order: index + 1,
        }),
      );
    }

    await this.replaceBudgetRows(requestId);
    await this.replaceBillingRows(requestId);
  }

  private async replaceBudgetRows(requestId: number): Promise<void> {
    for (const [index, section] of this.budgetSections.entries()) {
      const payload: BudgetSectionPayload = {
        section_code: section.code,
        section_name: section.title,
        total_amount_rm: this.moneyOrNull(section.totalAmount),
        requires_quotation: false,
        quotation_attachment_id: null,
        display_order: index + 1,
      };
      const response = await firstValueFrom(
        this.externalProjectApi.createBudgetSection(requestId, payload),
      );
      const sectionId = Number(response.data?.id);

      for (const [rowIndex, row] of section.rows.entries()) {
        const itemPayload: BudgetItemPayload = {
          external_form_budget_section_id: sectionId,
          description: this.clean(row.description),
          amount_rm: this.moneyOrNull(row.amount),
          display_order: rowIndex + 1,
        };
        await firstValueFrom(this.externalProjectApi.createBudgetItem(requestId, itemPayload));
      }
    }
  }

  private async replaceBillingRows(requestId: number): Promise<void> {
    const billedSections = this.budgetSections.filter(
      (section) => section.billingRequired === 'Yes',
    );
    if (!billedSections.length) {
      return;
    }

    const totalBillingAmount = billedSections.reduce(
      (total, section) => total + this.parseAmount(section.billingAmount),
      0,
    );
    const firstBillingDate =
      billedSections.find((section) => !!section.billingDate)?.billingDate || null;

    await firstValueFrom(
      this.externalProjectApi.createBilling(requestId, {
        billing_amount: totalBillingAmount ? totalBillingAmount.toFixed(2) : null,
        billing_date: firstBillingDate,
      }),
    );

    let displayOrder = 1;
    for (const section of billedSections) {
      for (const row of section.billingRows) {
        await firstValueFrom(
          this.externalProjectApi.createBillingItem(requestId, {
            description: this.clean(`${section.title}: ${row.description}`),
            amount_rm: this.moneyOrNull(row.amount),
            display_order: displayOrder,
          }),
        );
        displayOrder += 1;
      }
    }
  }

  private hydrateFromApi(data: ExternalProjectFormData): void {
    const project = data.external_project;
    if (!project) {
      return;
    }

    const category = this.grantCategoryById.get(Number(project.external_grant_category_id));
    this.externalProjectForm.patchValue(
      {
        externalGrantCategory:
          category?.name ?? this.externalProjectForm.controls.externalGrantCategory.value,
        projectAccountCode: project.project_account_code ?? project.project_code ?? '',
        referenceCode: project.reference_code ?? project.account_code ?? '',
        description: project.description ?? '',
        staffName: project.staff_name ?? '',
        schoolDepartment: project.school_department ?? '',
        sponsorName: project.sponsor_name ?? '',
        grantName: project.grant_name ?? '',
        startDate: project.start_date ?? '',
        endDate: project.end_date ?? '',
        durationMonths: project.duration_months == null ? '' : String(project.duration_months),
        researchTitle: project.research_title ?? '',
        totalBudgetRequest: project.total_budget_request ?? '',
        clientStakeholder: project.client_stakeholder ?? '',
        consultancyTitle: project.consultancy_title ?? '',
      },
      { emitEvent: false },
    );

    this.internalCoResearchers = (data.internal_co_researchers || []).map((row) => ({
      staffName: row.staff_name ?? '',
      schoolDepartment: row.school_department ?? '',
    }));
    this.externalCollaborators = (data.external_collaborators || []).map((row) => ({
      name: row.full_name ?? '',
      affiliation: row.affiliation ?? '',
    }));
    this.expectedOutcomes = (data.expected_outcomes || []).map((row) => ({
      description: row.description ?? '',
    }));
    this.hydrateBudgetRows(data);
    this.hydrateBillingRows(data);
  }

  private hydrateBudgetRows(data: ExternalProjectFormData): void {
    for (const section of this.budgetSections) {
      const apiSection = (data.budget_sections || []).find(
        (item) => item.section_code === section.code,
      );
      const apiRows = (data.budget_items || []).filter(
        (item) => Number(item.external_form_budget_section_id) === Number(apiSection?.id),
      );
      section.totalAmount = apiSection?.total_amount_rm ?? '';
      section.rows = apiRows.map((row) => ({
        description: row.description ?? '',
        amount: row.amount_rm ?? '',
      }));
      if (section.key === 'management-fee') {
        section.remark = data.external_project?.remark ?? section.remark;
        section.billingRequired = data.external_project?.is_billing_required ? 'Yes' : 'No';
      }
    }
  }

  private hydrateBillingRows(data: ExternalProjectFormData): void {
    const managementFee = this.budgetSections.find((section) => section.key === 'management-fee');
    if (!managementFee || !data.billing) {
      return;
    }

    managementFee.billingRequired = 'Yes';
    managementFee.billingAmount = data.billing.billing_amount ?? '';
    managementFee.billingDate = data.billing.billing_date ?? '';
    managementFee.billingRows = (data.billing_items || []).map((row) => ({
      description: String(row.description ?? '').replace(`${managementFee.title}: `, ''),
      amount: row.amount_rm ?? '',
    }));
  }

  private selectedGrantCategoryId(): number | null {
    const selected = this.externalProjectForm.controls.externalGrantCategory.value;
    if (!selected) {
      return null;
    }
    return this.grantCategoryByName.get(selected)?.id ?? null;
  }

  private selectedGrantCategoryName(): string {
    return String(this.externalProjectForm.controls.externalGrantCategory.value ?? '')
      .trim()
      .toLowerCase();
  }

  private clean(value: string | null | undefined): string | null {
    const trimmed = String(value ?? '').trim();
    return trimmed || null;
  }

  private moneyOrNull(value: string | null | undefined): string | null {
    const amount = this.parseAmount(value ?? '');
    return amount ? amount.toFixed(2) : null;
  }

  private toInteger(value: string | null | undefined): number | null {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { message?: string; errors?: unknown } }).error;
      if (payload?.message) {
        return payload.message;
      }
      if (payload?.errors) {
        return `${fallback} ${JSON.stringify(payload.errors)}`;
      }
    }
    return fallback;
  }

  private getStaffDepartment(staffName: string | null | undefined): string {
    return this.staffDirectory.find((staff) => staff.name === staffName)?.schoolDepartment ?? '';
  }

  private createBudgetSection(
    key: string,
    title: string,
    code: string,
    isManagementFee = false,
  ): BudgetSection {
    return {
      key,
      title,
      code,
      item: `${title} (${code})`,
      totalAmount: '',
      rows: [],
      billingRequired: isManagementFee ? 'No' : '',
      billingAmount: '',
      billingDate: '',
      billingRows: [],
      remark: isManagementFee ? '' : '',
    };
  }

  private updateBudgetSection(sectionKey: string, update: (section: BudgetSection) => void): void {
    const section = this.budgetSections.find((item) => item.key === sectionKey);
    if (section) {
      update(section);
    }
  }

  private configureTableEntryValidation(type: TableEntryType): void {
    Object.values(this.tableEntryForm.controls).forEach((control) => {
      control.clearValidators();
      control.updateValueAndValidity({ emitEvent: false });
    });

    const requiredControls = {
      internal: ['staffName'],
      external: ['name', 'affiliation'],
      outcome: ['description'],
      budget: ['description', 'amount'],
      billing: ['description', 'amount'],
    } satisfies Record<TableEntryType, readonly (keyof typeof this.tableEntryForm.controls)[]>;

    requiredControls[type].forEach((controlName) => {
      const control = this.tableEntryForm.controls[controlName];
      control.setValidators(
        controlName === 'amount'
          ? [Validators.required, Validators.min(0.01)]
          : [Validators.required],
      );
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  private getTableEntryValue(
    type: TableEntryType,
    sectionKey: string | null,
    index: number | null,
  ): Partial<typeof this.tableEntryForm.value> {
    if (index === null) {
      return {};
    }

    if (type === 'internal') {
      return this.internalCoResearchers[index] ?? {};
    }
    if (type === 'external') {
      return this.externalCollaborators[index] ?? {};
    }
    if (type === 'outcome') {
      return this.expectedOutcomes[index] ?? {};
    }

    const section = this.budgetSections.find((item) => item.key === sectionKey);
    return type === 'budget' ? (section?.rows[index] ?? {}) : (section?.billingRows[index] ?? {});
  }

  private upsertRow<T>(rows: readonly T[], row: T, index: number | null): T[] {
    return index === null
      ? [...rows, row]
      : rows.map((existingRow, rowIndex) => (rowIndex === index ? row : existingRow));
  }

  private recalculateBudgetSectionTotal(section: BudgetSection): void {
    section.totalAmount = section.rows
      .reduce((total, row) => total + this.parseAmount(row.amount), 0)
      .toFixed(2);
  }

  private parseAmount(value: string): number {
    const numeric = Number.parseFloat(String(value).replaceAll(',', ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private parseDate(value: string | null): {
    year: number;
    month: number;
    day: number;
    timestamp: number;
  } | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return {
      year,
      month,
      day,
      timestamp: Date.UTC(year, month - 1, day),
    };
  }
}
