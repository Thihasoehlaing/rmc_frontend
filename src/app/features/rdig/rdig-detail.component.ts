import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin, switchMap } from 'rxjs';

import {
  RdigApiService,
  RdigAttachmentDto,
  RdigBudgetItemDto,
  RdigBudgetSectionDto,
  RdigCoResearcherDto,
  RdigCollaboratorDto,
  RdigResearchActivityDto,
  RdigRequestDto,
} from './services/rdig-api.service';
import {
  RequestSummaryDto,
  WorkflowActionDto,
  WorkflowRequestsService,
} from '../../core/services/workflow-requests.service';
import { STATUS_COLORS } from '../../core/services/request-display.util';
import { formatMyrCurrency } from '../../shared/utils/currency.util';
import { formatDisplayDate } from '../../shared/utils/date-time.util';

interface DetailField {
  label: string;
  value: unknown;
  type?: 'date' | 'money' | 'boolean';
}

interface RdigDetailData {
  request?: RequestSummaryDto;
  rdig?: RdigRequestDto;
  apu_co_researchers?: RdigCoResearcherDto[];
  collaborators?: RdigCollaboratorDto[];
  research_activities?: RdigResearchActivityDto[];
  budget_sections?: RdigBudgetSectionDto[];
  budget_items?: RdigBudgetItemDto[];
  attachments?: RdigAttachmentDto[];
  [key: string]: unknown;
}

@Component({
  selector: 'app-rdig-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './rdig-detail.component.html',
  styleUrl: './rdig-detail.component.scss',
})
export class RdigDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rdigApi = inject(RdigApiService);
  private readonly requests = inject(WorkflowRequestsService);

  loading = signal(true);
  error = signal<string | null>(null);
  request = signal<RequestSummaryDto | null>(null);
  form = signal<RdigDetailData | null>(null);
  actions = signal<WorkflowActionDto[]>([]);

  readonly rdig = computed(() => this.form()?.rdig ?? null);
  readonly requestId = computed(() => this.request()?.id ?? this.request()?.request_id ?? null);
  readonly canPrint = computed(() => (this.request()?.status_code ?? '').toLowerCase() !== 'draft');

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
    const rdig = this.rdig();
    return [
      { label: 'Application Type', value: rdig?.application_type },
      { label: 'Project Category', value: rdig?.project_category },
      { label: 'Duration', value: rdig?.project_duration_months ? `${rdig.project_duration_months} months` : null },
      { label: 'Research Area', value: rdig?.research_area },
      { label: 'Research Cluster', value: rdig?.research_cluster_id },
      { label: 'Research Domain', value: rdig?.research_domain_id },
      { label: 'Sub Research Domain', value: rdig?.sub_research_domain_id },
      { label: 'Total Budget Request', value: rdig?.total_budget_request, type: 'money' },
    ];
  });

  readonly leaderFields = computed<DetailField[]>(() => {
    const rdig = this.rdig();
    return [
      { label: 'Leader Name', value: rdig?.project_leader_name || this.request()?.applicant_name },
      { label: 'Leader Email', value: rdig?.project_leader_email || this.request()?.applicant_email },
      { label: 'Department', value: rdig?.project_leader_department || this.request()?.applicant_department },
      { label: 'Job Position', value: rdig?.project_leader_job_position },
      { label: 'Role in Project', value: rdig?.project_leader_role_in_project },
    ];
  });

  readonly narrativeFields = computed<DetailField[]>(() => {
    const rdig = this.rdig();
    return [
      { label: 'Project Title', value: rdig?.project_title },
      { label: 'Executive Summary', value: rdig?.executive_summary },
      { label: 'Keywords', value: rdig?.keywords },
      { label: 'Introduction', value: rdig?.introduction },
      { label: 'Problem Statement', value: rdig?.problem_statement },
      { label: 'Research Aim & Objectives', value: rdig?.research_aim_objectives },
      { label: 'Research Questions', value: rdig?.research_questions },
      { label: 'Hypothesis / Propositions', value: rdig?.hypothesis_propositions },
      { label: 'Literature Review', value: rdig?.literature_review },
      { label: 'Research Methodology', value: rdig?.research_methodology },
      { label: 'References', value: rdig?.references_text },
    ];
  });

  readonly benefitFields = computed<DetailField[]>(() => {
    const rdig = this.rdig();
    return [
      { label: 'Benefit to APU', value: rdig?.benefit_to_apu },
      { label: 'Benefit to Students', value: rdig?.benefit_to_students },
      { label: 'Benefit to Stakeholders', value: rdig?.benefit_to_stakeholders },
      { label: 'Vision / Mission Alignment', value: rdig?.vision_mission_alignment },
      { label: 'Novelty Justification', value: rdig?.novelty_justification },
      { label: 'Budget Remarks', value: rdig?.budget_remarks },
    ];
  });

  readonly outputFields = computed<DetailField[]>(() => {
    const rdig = this.rdig();
    return [
      { label: 'Indexed Journal', value: rdig?.indexed_journal_selected, type: 'boolean' },
      { label: 'Indexed Journal Quantity', value: rdig?.indexed_journal_quantity },
      { label: 'Conceptual Design', value: rdig?.conceptual_design_selected, type: 'boolean' },
      { label: 'Knowledge Transfer Programme', value: rdig?.knowledge_transfer_programme_selected, type: 'boolean' },
      { label: 'External Grant Application', value: rdig?.application_external_grant_selected, type: 'boolean' },
      { label: 'Other Output', value: rdig?.other_output_selected, type: 'boolean' },
      { label: 'Other Output Specification', value: rdig?.other_output_specification },
    ];
  });

  readonly declarationFields = computed<DetailField[]>(() => {
    const rdig = this.rdig();
    return [
      { label: 'No Ongoing RDIG (Self)', value: rdig?.declaration_no_ongoing_rdig_self, type: 'boolean' },
      { label: 'No Ongoing RDIG (Co-Researchers)', value: rdig?.declaration_no_ongoing_rdig_coresearchers, type: 'boolean' },
      { label: 'Agreement Accepted', value: rdig?.declaration_agreement_accepted, type: 'boolean' },
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
          if ((res.data.form_code ?? '').toUpperCase() !== 'RDIG') {
            throw new Error('Not an RDIG request');
          }

          const requestId = res.data.id ?? res.data.request_id;
          if (requestId == null) {
            throw new Error('Request id is missing');
          }

          this.request.set(res.data);
          return forkJoin({
            form: this.rdigApi.getForm(requestId),
            actions: this.requests.getAvailableActions(requestId),
          });
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ form, actions }) => {
          this.form.set(form.data ?? {});
          this.request.set(form.data?.request ?? this.request());
          this.actions.set(actions.data?.available_actions ?? form.data?.request?.available_actions ?? []);
        },
        error: () => this.error.set('Could not load the RDIG detail.'),
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
    if (field.type === 'date') return formatDisplayDate(value as string);
    if (field.type === 'money') return formatMyrCurrency(value, String(value));
    return String(value);
  }

  budgetItemsFor(sectionId: number | undefined): RdigBudgetItemDto[] {
    if (sectionId == null) return [];
    return (this.form()?.budget_items ?? []).filter((item) => item.rdig_budget_section_id === sectionId);
  }

  money(value: unknown): string {
    return formatMyrCurrency(value, 'RM 0.00');
  }

  print(): void {
    const id = this.requestId();
    if (id == null) return;

    this.requests.downloadPrint(id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;
        const fileName = this.printFileName(
          response.headers.get('content-disposition'),
          this.request()?.request_code ?? 'rdig',
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('Could not download the print PDF. Please try again.'),
    });
  }

  private printFileName(contentDisposition: string | null, fallbackCode: string): string {
    const match = contentDisposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    return match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '')) : `${fallbackCode}.pdf`;
  }
}
