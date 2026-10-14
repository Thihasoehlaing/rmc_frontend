import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';

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
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';
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
    DatePickerComponent,
    DataTableComponent,
  ],
  templateUrl: './request-reports.component.html',
  styleUrl: './request-reports.component.scss',
})
export class RequestReportsComponent implements OnInit, OnDestroy {
  private readonly reportsService = inject(RequestReportsService);
  private readonly formCache = inject(FormCacheService);
  private readonly toastService = inject(ToastService);

  readonly rows = signal<RequestReportRow[]>([]);
  readonly forms = signal<CachedFormOption[]>([]);
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
  readonly period = signal('all');
  private searchTimer?: ReturnType<typeof setTimeout>;
  private reportSubscription?: Subscription;

  readonly totalItems = signal(0);
  readonly isLoading = signal(true);
  readonly isExporting = signal(false);
  readonly loadFailed = signal(false);

  readonly columns: readonly DataTableColumn[] = [
    { key: 'number', label: 'No.', width: '72px', align: 'center' },
    { key: 'request_code', label: 'Request Code', width: '180px' },
    { key: 'form_name', label: 'Form', width: '260px' },
    { key: 'applicant_name', label: 'Applicant', width: '220px' },
    { key: 'status_name', label: 'Status', width: '180px' },
    { key: 'submitted_at', label: 'Submitted Date', width: '180px' },
  ];

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) =>
    (row as RequestReportRow).request_id;

  ngOnInit(): void {
    this.loadExternalFieldOptions();
    this.loadForms();
  }

  loadReports(): void {
    this.reportSubscription?.unsubscribe();
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.reportSubscription = this.reportsService
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

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
    this.reportSubscription?.unsubscribe();
  }

  selectForm(code: string): void {
    this.selectedFormCode.set(code);
    this.applyFilters();
  }

  search(value: string): void {
    this.requestCode.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 450);
  }

  changeDate(value: string, side: 'from' | 'to'): void {
    this.period.set('custom');
    (side === 'from' ? this.dateFrom : this.dateTo).set(value || '');
    if (this.dateFrom() && this.dateTo() && this.dateFrom() <= this.dateTo()) this.applyFilters();
  }

  setPeriod(value: string): void {
    this.period.set(value);
    if (value === 'custom') return;
    const today = new Date();
    const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.dateFrom.set(value === 'all' ? '' : iso(new Date(today.getFullYear(), value === 'month' ? today.getMonth() : 0, 1)));
    this.dateTo.set(value === 'all' ? '' : iso(today));
    this.applyFilters();
  }

  applyFilters(): void {
    clearTimeout(this.searchTimer);
    if (!this.isDateRangeValid() || (this.period() === 'custom' && (!this.dateFrom() || !this.dateTo()))) return;
    this.syncAppliedFilters();
    this.loadReports();
  }

  resetFilters(): void {
    this.requestCode.set('');
    this.setPeriod('all');
  }

  pendingFilters(): boolean {
    return this.requestCode().trim() !== this.appliedRequestCode() ||
      this.dateFrom() !== this.appliedDateFrom() || this.dateTo() !== this.appliedDateTo() ||
      (this.period() === 'custom' && (!this.dateFrom() || !this.dateTo()));
  }

  scopeDescription(): string {
    switch (this.appliedFormCode()) {
      case 'RDIG': return 'Approved RDIG applications only.';
      case 'EXTERNAL': return 'Submitted external project records.';
      default: return 'Applications awaiting final CEO approval or already approved.';
    }
  }

  formLabel(code: string): string {
    return ({ CONFERENCE: 'Conference', JOURNAL: 'Journal', EXTERNAL: 'External', RDIG: 'RDIG' } as Record<string, string>)[code] || code;
  }

  exportExcel(): void {
    if (this.pendingFilters() || this.isLoading() || this.loadFailed() || this.isExporting()) return;

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
        const order = ['CONFERENCE', 'JOURNAL', 'EXTERNAL', 'RDIG'];
        const forms = (response.data ?? []).filter(form => order.includes(form.form_code)).sort((a, b) => order.indexOf(a.form_code) - order.indexOf(b.form_code));
        this.forms.set(forms);
        this.selectInitialForm(forms);
      },
      error: () => {
        this.forms.set([]);
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
      this.selectedFormCode() === 'EXTERNAL' ? this.selectedExternalFields() : [],
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
