import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { DropdownOption } from '../../../core/interfaces/components.interface';

type TableEntryType =
  | 'internal'
  | 'external'
  | 'outcome'
  | 'budget'
  | 'billing';

interface InternalCoResearcherRow {
  staffName: string;
  schoolDepartment: string;
}

interface StaffMember {
  name: string;
  schoolDepartment: string;
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
    CommonModule,
    ReactiveFormsModule,
    CustomSubheaderComponent,
    CharacterCounterComponent,
    DataTableComponent,
    ActionButtonComponent,
    SearchableDropdownComponent,
    DialogComponent,
  ],
  templateUrl: './external-project-data-entry.component.html',
  styleUrls: ['./external-project-data-entry.component.scss'],
})
export class ExternalProjectDataEntryComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly externalProjectForm = this.fb.group({
    externalGrantCategory: [''],
    projectCode: [''],
    accountCode: [''],
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

  protected readonly grantCategories = [
    'National',
    'International',
    'Private (Industry)',
    'Consultancy',
  ] as const;

  private readonly staffDirectory: readonly StaffMember[] = [
    { name: 'Dr. Ahmad Al-Hassan', schoolDepartment: 'Research Management Centre' },
    { name: 'Dr. John Smith', schoolDepartment: 'School of Business' },
    { name: 'Prof. Sarah Lim', schoolDepartment: 'School of Business' },
    { name: 'Assoc. Prof. Michael Tan', schoolDepartment: 'School of Computing & Technology' },
    { name: 'Dr. Nur Aisyah Rahman', schoolDepartment: 'School of Engineering' },
    { name: 'Dr. Daniel Wong', schoolDepartment: 'School of Media & Design' },
  ];

  readonly projectLeaderOptions: DropdownOption<string>[] = this.staffDirectory.map(staff => ({
    value: staff.name,
    label: staff.name,
  }));

  readonly internalCoResearcherColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: 'var(--size-table-column-index)', align: 'center', headerAlign: 'center' },
    { key: 'staffName', label: 'Staff Name' },
    { key: 'schoolDepartment', label: 'School/Department' },
    { key: 'actions', label: 'Action', width: 'var(--size-table-column-actions)', align: 'right', headerAlign: 'right' },
  ];

  readonly externalCollaboratorColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: 'var(--size-table-column-index)', align: 'center', headerAlign: 'center' },
    { key: 'name', label: 'Name' },
    { key: 'affiliation', label: 'Affiliation' },
    { key: 'actions', label: 'Action', width: 'var(--size-table-column-actions)', align: 'right', headerAlign: 'right' },
  ];

  readonly expectedOutcomeColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: 'var(--size-table-column-index)', align: 'center', headerAlign: 'center' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Action', width: 'var(--size-table-column-actions)', align: 'right', headerAlign: 'right' },
  ];

  readonly budgetBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: 'var(--size-table-column-index)', align: 'center', headerAlign: 'center' },
    { key: 'description', label: 'Description of Expense' },
    { key: 'amount', label: 'Amount (RM)', width: 'var(--size-table-column-amount)' },
    { key: 'actions', label: 'Action', width: 'var(--size-table-column-actions)', align: 'right', headerAlign: 'right' },
  ];

  readonly billingBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'index', label: '#', width: 'var(--size-table-column-index)', align: 'center', headerAlign: 'center' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount (RM)', width: 'var(--size-table-column-amount)' },
    { key: 'actions', label: 'Action', width: 'var(--size-table-column-actions)', align: 'right', headerAlign: 'right' },
  ];

  internalCoResearchers: InternalCoResearcherRow[] = [];
  externalCollaborators: ExternalCollaboratorRow[] = [];
  expectedOutcomes: ExpectedOutcomeRow[] = [];
  completeAttempted = false;
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
    merge(
      this.externalProjectForm.controls.startDate.valueChanges,
      this.externalProjectForm.controls.endDate.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateProjectDuration());

    this.externalProjectForm.controls.staffName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(staffName => {
        this.externalProjectForm.controls.schoolDepartment.setValue(
          this.getStaffDepartment(staffName),
          { emitEvent: false },
        );
      });

    this.tableEntryForm.controls.staffName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(staffName => {
        this.tableEntryForm.controls.schoolDepartment.setValue(
          this.getStaffDepartment(staffName),
          { emitEvent: false },
        );
      });
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
    return this.externalProjectForm.get('externalGrantCategory')?.value === 'Consultancy';
  }

  showProjectFlow(): boolean {
    return this.isNationalSelected() || this.isInternationalSelected() || this.isPrivateIndustrySelected();
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
    const durationMonths = Math.max(
      1,
      calendarMonthDifference + (includesPartialMonth ? 1 : 0),
    );

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
        this.updateBudgetSection(this.activeSectionKey ?? '', section => {
          section.rows = this.upsertRow(
            section.rows,
            { description: value.description ?? '', amount: value.amount ?? '' },
            index,
          );
          this.recalculateBudgetSectionTotal(section);
        });
        break;
      case 'billing':
        this.updateBudgetSection(this.activeSectionKey ?? '', section => {
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
    this.budgetSections.forEach(section => {
      if (section.key === sectionKey) {
        section.item = value;
      }
    });
  }

  updateBudgetSectionTotal(sectionKey: string, value: string): void {
    this.budgetSections.forEach(section => {
      if (section.key === sectionKey) {
        section.totalAmount = value;
      }
    });
  }

  updateBudgetSectionRemark(sectionKey: string, value: string): void {
    this.budgetSections.forEach(section => {
      if (section.key === sectionKey) {
        section.remark = value;
      }
    });
  }

  updateBillingRequired(sectionKey: string, value: 'Yes' | 'No'): void {
    this.budgetSections.forEach(section => {
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
    this.updateBudgetSection(sectionKey, section => {
      section.billingAmount = value;
    });
  }

  updateBillingDate(sectionKey: string, value: string): void {
    this.updateBudgetSection(sectionKey, section => {
      section.billingDate = value;
    });
  }

  isBillingFieldInvalid(section: BudgetSection, field: 'amount' | 'date'): boolean {
    if (!this.completeAttempted || section.billingRequired !== 'Yes') {
      return false;
    }

    return field === 'amount'
      ? this.parseAmount(section.billingAmount) <= 0
      : !section.billingDate;
  }

  isBillingBreakdownInvalid(section: BudgetSection): boolean {
    if (!this.completeAttempted || section.billingRequired !== 'Yes') {
      return false;
    }

    return !section.billingRows.some(row =>
      row.description.trim().length > 0 && this.parseAmount(row.amount) > 0
    );
  }

  budgetSummaryTotal(): string {
    const total = this.budgetSections.reduce((sum, section) => sum + this.parseAmount(section.totalAmount), 0);
    return total ? total.toFixed(2) : '0.00';
  }

  removeInternalCoResearcherRow(index: number): void {
    this.internalCoResearchers = this.internalCoResearchers.filter((_, rowIndex) => rowIndex !== index);
  }

  removeExternalCollaboratorRow(index: number): void {
    this.externalCollaborators = this.externalCollaborators.filter((_, rowIndex) => rowIndex !== index);
  }

  removeExpectedOutcomeRow(index: number): void {
    this.expectedOutcomes = this.expectedOutcomes.filter((_, rowIndex) => rowIndex !== index);
  }

  removeBudgetRow(sectionKey: string, index: number): void {
    this.updateBudgetSection(sectionKey, section => {
      section.rows = section.rows.filter((_, rowIndex) => rowIndex !== index);
      this.recalculateBudgetSectionTotal(section);
    });
  }

  removeBillingRow(sectionKey: string, index: number): void {
    this.updateBudgetSection(sectionKey, section => {
      section.billingRows = section.billingRows.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackBudgetSection(index: number, section: BudgetSection): string {
    return section.key;
  }

  saveDraft(): void {
    this.externalProjectForm.markAsPristine();
  }

  complete(): void {
    this.completeAttempted = true;
    this.externalProjectForm.markAllAsTouched();
  }

  private getStaffDepartment(staffName: string | null | undefined): string {
    return this.staffDirectory.find(staff => staff.name === staffName)?.schoolDepartment ?? '';
  }

  private createBudgetSection(key: string, title: string, code: string, isManagementFee = false): BudgetSection {
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
    const section = this.budgetSections.find(item => item.key === sectionKey);
    if (section) {
      update(section);
    }
  }

  private configureTableEntryValidation(type: TableEntryType): void {
    Object.values(this.tableEntryForm.controls).forEach(control => {
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

    requiredControls[type].forEach(controlName => {
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

    const section = this.budgetSections.find(item => item.key === sectionKey);
    return type === 'budget'
      ? section?.rows[index] ?? {}
      : section?.billingRows[index] ?? {};
  }

  private upsertRow<T>(rows: readonly T[], row: T, index: number | null): T[] {
    return index === null
      ? [...rows, row]
      : rows.map((existingRow, rowIndex) => rowIndex === index ? row : existingRow);
  }

  private recalculateBudgetSectionTotal(section: BudgetSection): void {
    section.totalAmount = section.rows
      .reduce((total, row) => total + this.parseAmount(row.amount), 0)
      .toFixed(2);
  }

  private parseAmount(value: string): number {
    const numeric = Number.parseFloat(value);
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
