import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, switchMap } from 'rxjs';

import {
  ExternalGrantCategory,
  ExternalProjectApiService,
  ExternalProjectFormData,
} from './external-project-api.service';
import {
  RequestSummaryDto,
  WorkflowRequestsService,
} from '../../core/services/workflow-requests.service';
import { STATUS_COLORS } from '../../core/services/request-display.util';

interface DetailField {
  label: string;
  value: unknown;
  type?: 'date' | 'money' | 'boolean';
}

@Component({
  selector: 'app-external-project-detail',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe, DecimalPipe],
  templateUrl: './external-project-detail.component.html',
  styleUrl: './external-project-detail.component.scss',
})
export class ExternalProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly externalProjectApi = inject(ExternalProjectApiService);
  private readonly requests = inject(WorkflowRequestsService);
  private readonly datePipe = inject(DatePipe);
  private readonly decimalPipe = inject(DecimalPipe);

  loading = signal(true);
  error = signal<string | null>(null);
  request = signal<RequestSummaryDto | null>(null);
  form = signal<ExternalProjectFormData | null>(null);
  categories = signal<ExternalGrantCategory[]>([]);

  readonly externalProject = computed(() => this.form()?.external_project ?? null);
  readonly backLabel = signal(this.route.snapshot.queryParamMap.get('returnLabel') || 'Admin History');
  readonly categoryName = computed(() => {
    const categoryId = this.externalProject()?.external_grant_category_id;
    return this.categories().find((category) => category.id === categoryId)?.name ?? categoryId ?? '-';
  });

  readonly requestFields = computed<DetailField[]>(() => {
    const req = this.request();
    return [
      { label: 'Request Code', value: req?.request_code },
      { label: 'Status', value: req?.status_name || req?.status_code },
      { label: 'Applicant Name', value: req?.applicant_name },
      { label: 'Applicant Email', value: req?.applicant_email },
      { label: 'Department', value: req?.applicant_department },
      { label: 'Created Date', value: req?.created_at, type: 'date' },
      { label: 'Submitted Date', value: req?.submitted_at, type: 'date' },
    ];
  });

  readonly projectFields = computed<DetailField[]>(() => {
    const project = this.externalProject();
    return [
      { label: 'External Grant Category', value: this.categoryName() },
      { label: 'Project Account Code', value: project?.project_account_code ?? project?.project_code },
      { label: 'Reference Code', value: project?.reference_code ?? project?.account_code },
      { label: 'Description', value: project?.description },
      { label: 'Staff Name', value: project?.staff_name },
      { label: 'School / Department', value: project?.school_department },
      { label: 'Sponsor Name', value: project?.sponsor_name },
      { label: 'Grant Name', value: project?.grant_name },
      { label: 'Client / Stakeholder', value: project?.client_stakeholder },
    ];
  });

  readonly timelineFields = computed<DetailField[]>(() => {
    const project = this.externalProject();
    return [
      { label: 'Start Date', value: project?.start_date, type: 'date' },
      { label: 'End Date', value: project?.end_date, type: 'date' },
      { label: 'Duration', value: project?.duration_months ? `${project.duration_months} months` : null },
      { label: 'Billing Required', value: project?.is_billing_required, type: 'boolean' },
      { label: 'Total Budget Request', value: project?.total_budget_request, type: 'money' },
    ];
  });

  readonly titleFields = computed<DetailField[]>(() => {
    const project = this.externalProject();
    return [
      { label: 'Research Title', value: project?.research_title },
      { label: 'Consultancy Title', value: project?.consultancy_title },
      { label: 'Remark', value: project?.remark },
    ];
  });

  ngOnInit(): void {
    const requestCode = this.route.snapshot.paramMap.get('requestCode')?.trim();
    if (!requestCode) {
      this.error.set('Invalid request code.');
      this.loading.set(false);
      return;
    }

    this.requests
      .getRequestByCode(requestCode)
      .pipe(
        switchMap((res) => {
          if ((res.data.form_code ?? '').toUpperCase() !== 'EXTERNAL') {
            throw new Error('Not an external project request');
          }

          const requestId = res.data.id ?? res.data.request_id;
          if (requestId == null) {
            throw new Error('Request id is missing');
          }

          this.request.set(res.data);
          return forkJoin({
            form: this.externalProjectApi.getForm(requestId),
            categories: this.externalProjectApi.listGrantCategories(),
          });
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ form, categories }) => {
          this.form.set(form.data);
          this.request.set(form.data.request ?? this.request());
          this.categories.set(categories.data ?? []);
        },
        error: () => this.error.set('Could not load the external project detail.'),
      });
  }

  statusColor(): string {
    const request = this.request();
    return request ? STATUS_COLORS[request.status_code] ?? '#6b7280' : '#6b7280';
  }

  displayValue(field: DetailField): string {
    const value = field.value;
    if (value == null || value === '') return '-';
    if (field.type === 'boolean') return value ? 'Yes' : 'No';
    if (field.type === 'date') return this.datePipe.transform(value as string, 'dd MMM yyyy') ?? '-';
    if (field.type === 'money') {
      const amount = Number(value);
      return Number.isFinite(amount) ? `RM ${this.decimalPipe.transform(amount, '1.2-2')}` : String(value);
    }
    return String(value);
  }

  budgetItemsFor(sectionId: number): any[] {
    return (this.form()?.budget_items ?? []).filter(
      (item) => item.external_form_budget_section_id === sectionId,
    );
  }

  goBack(): void {
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo') || '/submissions/admin-history';
    void this.router.navigateByUrl(returnTo);
  }
}
