import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { CustomSubheaderComponent } from '../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../shared/components/character-counter/character-counter.component';
import { DataTableComponent, DataTableColumn } from '../../shared/components/data-table/data-table.component';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button.component';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';

interface InternalCoResearcherRow {
  selected: boolean;
  staffName: string;
  schoolDepartment: string;
}

interface BudgetBreakdownRow {
  selected: boolean;
  description: string;
  amount: string;
}

interface BudgetSection {
  key: string;
  title: string;
  code: string;
  item: string;
  totalAmount: string;
  requiresQuotation: boolean;
  quotationLabel: string;
  quotationFileName: string;
  rows: BudgetBreakdownRow[];
  billingRequired: 'Yes' | 'No' | '';
  remark: string;
}

interface ExternalCollaboratorRow {
  selected: boolean;
  name: string;
  affiliation: string;
}

interface ExpectedOutcomeRow {
  selected: boolean;
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
    FileUploadComponent,
  ],
  templateUrl: './external-project-data-entry.component.html',
  styleUrls: ['./external-project-data-entry.component.scss'],
})
export class ExternalProjectDataEntryComponent {
  private readonly fb = inject(FormBuilder);

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

  protected readonly grantCategories = [
    'National',
    'International',
    'Private (Industry)',
    'Consultancy',
  ] as const;

  readonly internalCoResearcherColumns: readonly DataTableColumn[] = [
    { key: 'selected', label: '', width: '56px', align: 'center', headerAlign: 'center' },
    { key: 'staffName', label: 'Staff Name' },
    { key: 'schoolDepartment', label: 'School/Department' },
  ];

  readonly externalCollaboratorColumns: readonly DataTableColumn[] = [
    { key: 'selected', label: '', width: '56px', align: 'center', headerAlign: 'center' },
    { key: 'name', label: 'Name' },
    { key: 'affiliation', label: 'Affiliation' },
  ];

  readonly expectedOutcomeColumns: readonly DataTableColumn[] = [
    { key: 'selected', label: '', width: '56px', align: 'center', headerAlign: 'center' },
    { key: 'description', label: 'Description' },
  ];

  readonly budgetBreakdownColumns: readonly DataTableColumn[] = [
    { key: 'selected', label: '', width: '56px', align: 'center', headerAlign: 'center' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount (RM)', width: '180px' },
  ];

  internalCoResearchers: InternalCoResearcherRow[] = [this.createInternalCoResearcherRow()];
  externalCollaborators: ExternalCollaboratorRow[] = [this.createExternalCollaboratorRow()];
  expectedOutcomes: ExpectedOutcomeRow[] = [this.createExpectedOutcomeRow()];

  readonly budgetSections: BudgetSection[] = [
    this.createBudgetSection('student-allowances', 'Student Allowances', 'V11000', false),
    this.createBudgetSection('travel-accommodation', 'Travelling and Accommodation', 'V21000', true),
    this.createBudgetSection('rental', 'Rental', 'V24000', true),
    this.createBudgetSection('materials-supplies', 'Research Materials and Supplies', 'V27000', true),
    this.createBudgetSection('maintenance-repair', 'Maintenance & Minor Repair Services', 'V28000', true),
    this.createBudgetSection('special-services', 'Special Services', 'V29000', true),
    this.createBudgetSection('accessories-equipment', 'Accessories & Equipment', 'V35000', true),
    this.createBudgetSection('management-fee', 'Management Fee', 'V40000', false, true),
  ];

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


  addInternalCoResearcherRow(): void {
    this.internalCoResearchers = [...this.internalCoResearchers, this.createInternalCoResearcherRow()];
  }

  addExternalCollaboratorRow(): void {
    this.externalCollaborators = [...this.externalCollaborators, this.createExternalCollaboratorRow()];
  }

  addExpectedOutcomeRow(): void {
    this.expectedOutcomes = [...this.expectedOutcomes, this.createExpectedOutcomeRow()];
  }

  addBudgetRow(sectionKey: string): void {
    this.budgetSections.forEach(section => {
      if (section.key === sectionKey) {
        section.rows = [...section.rows, this.createBudgetBreakdownRow()];
      }
    });
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
      }
    });
  }

  updateBudgetRowSelection(sectionKey: string, index: number, selected: boolean): void {
    this.budgetSections.forEach(section => {
      if (section.key === sectionKey) {
        section.rows = section.rows.map((row, rowIndex) => rowIndex === index ? { ...row, selected } : row);
      }
    });
  }

  updateBudgetRowDescription(sectionKey: string, index: number, description: string): void {
    this.budgetSections.forEach(section => {
      if (section.key === sectionKey) {
        section.rows = section.rows.map((row, rowIndex) => rowIndex === index ? { ...row, description } : row);
      }
    });
  }

  updateBudgetRowAmount(sectionKey: string, index: number, amount: string): void {
    this.budgetSections.forEach(section => {
      if (section.key === sectionKey) {
        section.rows = section.rows.map((row, rowIndex) => rowIndex === index ? { ...row, amount } : row);
      }
    });
  }

  onQuotationSelected(sectionKey: string, file: File | null): void {
    this.budgetSections.forEach(section => {
      if (section.key === sectionKey) {
        section.quotationFileName = file?.name ?? '';
      }
    });
  }

  budgetSummaryTotal(): string {
    const total = this.budgetSections.reduce((sum, section) => sum + this.parseAmount(section.totalAmount), 0);
    return total ? total.toFixed(2) : '0.00';
  }

  updateInternalSelection(index: number, selected: boolean): void {
    this.internalCoResearchers = this.internalCoResearchers.map((row, rowIndex) =>
      rowIndex === index ? { ...row, selected } : row
    );
  }

  updateExternalSelection(index: number, selected: boolean): void {
    this.externalCollaborators = this.externalCollaborators.map((row, rowIndex) =>
      rowIndex === index ? { ...row, selected } : row
    );
  }

  updateExpectedOutcomeSelection(index: number, selected: boolean): void {
    this.expectedOutcomes = this.expectedOutcomes.map((row, rowIndex) =>
      rowIndex === index ? { ...row, selected } : row
    );
  }

  updateInternalCoResearcherStaffName(index: number, staffName: string): void {
    this.internalCoResearchers = this.internalCoResearchers.map((row, rowIndex) =>
      rowIndex === index ? { ...row, staffName } : row
    );
  }

  updateInternalCoResearcherSchoolDepartment(index: number, schoolDepartment: string): void {
    this.internalCoResearchers = this.internalCoResearchers.map((row, rowIndex) =>
      rowIndex === index ? { ...row, schoolDepartment } : row
    );
  }

  updateExternalCollaboratorName(index: number, name: string): void {
    this.externalCollaborators = this.externalCollaborators.map((row, rowIndex) =>
      rowIndex === index ? { ...row, name } : row
    );
  }

  updateExternalCollaboratorAffiliation(index: number, affiliation: string): void {
    this.externalCollaborators = this.externalCollaborators.map((row, rowIndex) =>
      rowIndex === index ? { ...row, affiliation } : row
    );
  }

  updateExpectedOutcomeDescription(index: number, description: string): void {
    this.expectedOutcomes = this.expectedOutcomes.map((row, rowIndex) =>
      rowIndex === index ? { ...row, description } : row
    );
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
    this.externalProjectForm.markAllAsTouched();
  }

  private createInternalCoResearcherRow(): InternalCoResearcherRow {
    return {
      selected: false,
      staffName: '',
      schoolDepartment: '',
    };
  }

  private createExternalCollaboratorRow(): ExternalCollaboratorRow {
    return {
      selected: false,
      name: '',
      affiliation: '',
    };
  }

  private createExpectedOutcomeRow(): ExpectedOutcomeRow {
    return {
      selected: false,
      description: '',
    };
  }

  private createBudgetBreakdownRow(): BudgetBreakdownRow {
    return {
      selected: false,
      description: '',
      amount: '',
    };
  }

  private createBudgetSection(key: string, title: string, code: string, requiresQuotation: boolean, isManagementFee = false): BudgetSection {
    return {
      key,
      title,
      code,
      item: `${title} (${code})`,
      totalAmount: '',
      requiresQuotation,
      quotationLabel: 'Uploaded Quotation',
      quotationFileName: '',
      rows: [this.createBudgetBreakdownRow()],
      billingRequired: isManagementFee ? 'No' : '',
      remark: isManagementFee ? '' : '',
    };
  }

  private parseAmount(value: string): number {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}