import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
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
import { SearchableDropdownComponent } from '../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { ReportDateRangePickerComponent } from './date-range-picker.component';
import {
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
    SearchableDropdownComponent,
    TableSkeletonComponent,
    ReportDateRangePickerComponent,
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

  applyFilters(): void {
    if (!this.isDateRangeValid()) return;

    this.syncAppliedFilters();
    this.loadReports();
  }

  resetFilters(): void {
    const firstFormCode = this.forms()[0]?.form_code ?? '';
    this.selectedFormCode.set(firstFormCode);
    this.selectedExternalFields.set([]);
    this.requestCode.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.appliedFormCode.set(firstFormCode);
    this.appliedExternalFields.set([]);
    this.appliedRequestCode.set('');
    this.appliedDateFrom.set('');
    this.appliedDateTo.set('');
    this.loadReports();
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
    return this.selectedFormCode().toUpperCase() === 'EXTERNAL';
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
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  private defaultExportName(): string {
    return `rmc-request-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  }
}
