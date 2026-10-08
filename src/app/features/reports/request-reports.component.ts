import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  CachedFormOption,
  FormCacheService,
} from '../../core/services/form-cache.service';
import { DropdownOption } from '../../core/interfaces/components.interface';
import { ToastService } from '../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../shared/components/data-table/data-table.component';
import { NoteComponent } from '../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';import {
  ExternalReportFieldOption,
  RequestReportQuery,
  RequestReportRow,
  RequestReportsService,
} from './request-reports.service';

@Component({
  selector: 'app-request-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    NoteComponent,
    SearchableDropdownComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './request-reports.component.html',
  styleUrl: './request-reports.component.scss',
})
export class RequestReportsComponent implements OnInit {
  private readonly reportsService = inject(RequestReportsService);
  private readonly formCache = inject(FormCacheService);
  private readonly toastService = inject(ToastService);

  readonly rows = signal<RequestReportRow[]>([]);
  readonly forms = signal<CachedFormOption[]>([]);
  readonly formOptions = signal<DropdownOption<string>[]>([]);
  readonly externalFieldOptions = signal<DropdownOption<string>[]>([]);
  readonly selectedFormCode = signal('');
  readonly selectedExternalFields = signal<string[]>([]);
  readonly requestCode = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly appliedFormCode = signal('');
  readonly appliedExternalFields = signal<string[]>([]);
  readonly appliedRequestCode = signal('');
  readonly appliedDateFrom = signal('');
  readonly appliedDateTo = signal('');
  readonly filtersOpen = signal(false);

  readonly totalItems = signal(0);
  readonly isLoading = signal(true);
  readonly isExporting = signal(false);
  readonly loadFailed = signal(false);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'request_code', label: 'Request Code', width: '180px' },
    { key: 'form_name', label: 'Form', width: '260px' },
    { key: 'applicant_name', label: 'Applicant', width: '220px' },
    { key: 'submitted_at', label: 'Submitted Date', width: '180px' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) =>
    (row as RequestReportRow).request_id;

  ngOnInit(): void {
    this.loadExternalFieldOptions();
    this.loadForms();
  }

  loadReports(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.reportsService
      .list(this.currentQuery())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.rows.set(response.data.items);
          this.totalItems.set(response.data.pagination.total_items);
        },
        error: () => {
          this.rows.set([]);
          this.totalItems.set(0);
          this.loadFailed.set(true);
        },
      });
  }

  openFilters(): void {
    this.resetDraftFilters();
    this.filtersOpen.set(true);
  }

  closeFilters(): void {
    this.resetDraftFilters();
    this.filtersOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.filtersOpen()) this.closeFilters();
  }

  applyFilters(): void {
    if (!this.isDateRangeValid()) return;

    this.syncAppliedFilters();
    this.filtersOpen.set(false);
    this.loadReports();
  }

  /** Clears the draft request code and dates only; the form stays selected until Apply. */
  resetFilters(): void {
    this.requestCode.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  exportExcel(): void {
    if (!this.isDateRangeValid() || this.isExporting()) return;

    this.syncAppliedFilters();
    this.isExporting.set(true);
    this.reportsService
      .exportExcel(this.currentQuery())
      .pipe(finalize(() => this.isExporting.set(false)))
      .subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) {
            this.toastService.error('Excel file is unavailable.');
            return;
          }

          this.downloadBlob(blob, this.resolveFilename(response) || this.defaultExportName());
        },
        error: () => this.toastService.error('Unable to download the report.'),
      });
  }

  rowNumber(index: number): number {
    return index + 1;
  }

  isExternalFormSelected(): boolean {
    return this.appliedFormCode().toUpperCase() === 'EXTERNAL';
  }

  isExternalFieldSelected(value: string): boolean {
    return this.selectedExternalFields().includes(value);
  }

  toggleExternalField(value: string): void {
    this.selectedExternalFields.update((fields) =>
      fields.includes(value)
        ? fields.filter((field) => field !== value)
        : [...fields, value],
    );
  }

  selectAllExternalFields(): void {
    this.selectedExternalFields.set(
      this.externalFieldOptions().map((option) => option.value),
    );
  }

  clearExternalFields(): void {
    this.selectedExternalFields.set([]);
  }

  isDateRangeValid(): boolean {
    const from = this.dateFrom();
    const to = this.dateTo();
    if (from && to && from > to) {
      this.toastService.error('Submission date to must be on or after submission date from.');
      return false;
    }
    return true;
  }

  private loadForms(): void {
    this.formCache.getActiveForms().subscribe({
      next: (response) => {
        const forms = response.data ?? [];
        this.forms.set(forms);
        this.formOptions.set(
          forms.map((form) => ({
            value: form.form_code,
            label: form.form_name,
            description: form.form_code,
            searchText: `${form.form_name} ${form.form_code}`,
          })),
        );
        this.selectInitialForm(forms);
      },
      error: () => {
        this.forms.set([]);
        this.formOptions.set([]);
        this.rows.set([]);
        this.totalItems.set(0);
        this.isLoading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  private loadExternalFieldOptions(): void {
    this.reportsService.getExternalFieldOptions().subscribe({
      next: (response) => {
        this.externalFieldOptions.set(
          (response.data ?? []).map((option: ExternalReportFieldOption) => ({
            value: option.value,
            label: option.label,
            description: option.source,
            searchText: `${option.label} ${option.source} ${option.value}`,
          })),
        );
      },
      error: () => this.externalFieldOptions.set([]),
    });
  }

  private selectInitialForm(forms: CachedFormOption[]): void {
    const firstFormCode = forms[0]?.form_code ?? '';
    if (!firstFormCode) {
      this.selectedFormCode.set('');
      this.appliedFormCode.set('');
      this.rows.set([]);
      this.totalItems.set(0);
      this.isLoading.set(false);
      return;
    }

    this.selectedFormCode.set(firstFormCode);
    this.selectedExternalFields.set([]);
    this.appliedFormCode.set(firstFormCode);
    this.appliedExternalFields.set([]);
    this.loadReports();
  }

  private resetDraftFilters(): void {
    this.selectedFormCode.set(this.appliedFormCode());
    this.requestCode.set(this.appliedRequestCode());
    this.dateFrom.set(this.appliedDateFrom());
    this.dateTo.set(this.appliedDateTo());
  }

  private syncAppliedFilters(): void {
    this.appliedFormCode.set(this.selectedFormCode());
    this.appliedExternalFields.set(
      this.isExternalFormSelected() ? this.selectedExternalFields() : [],
    );
    this.appliedRequestCode.set(this.requestCode().trim());
    this.appliedDateFrom.set(this.dateFrom());
    this.appliedDateTo.set(this.dateTo());
  }

  private currentQuery(): RequestReportQuery {
    return {
      formCode: this.appliedFormCode(),
      requestCode: this.appliedRequestCode(),
      dateFrom: this.appliedDateFrom(),
      dateTo: this.appliedDateTo(),
      externalFields:
        this.appliedFormCode().toUpperCase() === 'EXTERNAL'
          ? this.appliedExternalFields()
          : [],
    };
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private resolveFilename(response: { headers: { get(name: string): string | null } }): string | null {
    const disposition = response.headers.get('content-disposition');
    const match = disposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    return match?.[1] ? decodeURIComponent(match[1].replace(/(^"|"$)/g, '')) : null;
  }

  private defaultExportName(): string {
    return `rmc_${this.safeFilename(this.selectedExportFormName())}_${this.exportDatePart()}.xlsx`;
  }

  private selectedExportFormName(): string {
    const formCode = this.appliedFormCode();
    return (
      this.forms().find((form) => form.form_code === formCode)?.form_name ||
      formCode ||
      'request_report'
    );
  }

  private exportDatePart(): string {
    const dateFrom = this.appliedDateFrom();
    const dateTo = this.appliedDateTo();
    if (dateFrom && dateTo) {
      return `${dateFrom}_to_${dateTo}`;
    }
    return dateFrom || dateTo || new Date().toISOString().slice(0, 10);
  }

  private safeFilename(value: string): string {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'report'
    );
  }
}
