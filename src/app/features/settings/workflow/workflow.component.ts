import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, forkJoin, map, of, tap } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DetailPanelSkeletonComponent } from '../../../shared/components/detail-panel-skeleton/detail-panel-skeleton.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  FormOption,
  RoleOption,
  StaffOption,
  WorkflowActorType,
  WorkflowProcess,
  WorkflowService,
  WorkflowStep,
  WorkflowTabKey,
} from './workflow.service';

type StatusFilter = '' | 'Active' | 'Inactive';
type DialogMode = 'create' | 'edit';
type FieldType = 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'date';
type OptionSource = 'forms' | 'processes' | 'actorTypes' | 'steps' | 'roles' | 'staff' | 'assignmentTypes';

interface WorkflowField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  optionSource?: OptionSource;
  placeholder?: string;
}

interface WorkflowTab {
  key: WorkflowTabKey;
  label: string;
  title: string;
  description: string;
  createLabel: string;
  emptyIcon: string;
  hasStatus: boolean;
  columns: readonly DataTableColumn[];
  fields: readonly WorkflowField[];
}

const PAGE_SIZE = 10;

const TABS: readonly WorkflowTab[] = [
  {
    key: 'processes',
    label: 'Processes',
    title: 'Processes',
    description: 'Configure active workflow processes by form.',
    createLabel: 'Create Process',
    emptyIcon: 'account_tree',
    hasStatus: true,
    columns: [
      { key: 'number', label: 'No.', width: '72px', align: 'center' },
      { key: 'form', label: 'Form', width: '190px' },
      { key: 'name', label: 'Workflow Name', width: '260px' },
      { key: 'status', label: 'Status', width: '120px', align: 'center' },
      { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
    ],
    fields: [
      { key: 'form_id', label: 'Form', type: 'select', optionSource: 'forms', required: true },
      { key: 'workflow_name', label: 'Workflow Name', type: 'text', required: true },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },
  {
    key: 'steps',
    label: 'Steps',
    title: 'Steps',
    description: 'Configure workflow steps and current status mapping.',
    createLabel: 'Create Step',
    emptyIcon: 'timeline',
    hasStatus: false,
    columns: [
      { key: 'number', label: 'No.', width: '72px', align: 'center' },
      { key: 'process', label: 'Process', width: '190px' },
      { key: 'step', label: 'Step', width: '220px' },
      { key: 'actor', label: 'Actor', width: '180px' },
      { key: 'statusCode', label: 'Status Code', width: '170px' },
      { key: 'flags', label: 'Flags', width: '160px' },
      { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
    ],
    fields: [
      { key: 'workflow_process_id', label: 'Process', type: 'select', optionSource: 'processes', required: true },
      { key: 'step_no', label: 'Step No.', type: 'number', required: true },
      { key: 'step_code', label: 'Step Code', type: 'text', required: true },
      { key: 'step_name', label: 'Step Name', type: 'text', required: true },
      { key: 'actor_type_id', label: 'Actor Type', type: 'select', optionSource: 'actorTypes' },
      { key: 'status_code', label: 'Status Code', type: 'text', required: true },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_required', label: 'Required step', type: 'checkbox' },
      { key: 'is_final_step', label: 'Final step', type: 'checkbox' },
    ],
  },
  {
    key: 'step-actions',
    label: 'Step Actions',
    title: 'Step Actions',
    description: 'Configure available actions and next status per step.',
    createLabel: 'Create Action',
    emptyIcon: 'bolt',
    hasStatus: true,
    columns: [
      { key: 'number', label: 'No.', width: '72px', align: 'center' },
      { key: 'step', label: 'Step', width: '220px' },
      { key: 'code', label: 'Action Code', width: '170px' },
      { key: 'name', label: 'Action Name', width: '220px' },
      { key: 'nextStatus', label: 'Next Status', width: '160px' },
      { key: 'status', label: 'Status', width: '120px', align: 'center' },
      { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
    ],
    fields: [
      { key: 'workflow_step_id', label: 'Step', type: 'select', optionSource: 'steps', required: true },
      { key: 'action_code', label: 'Action Code', type: 'text', required: true },
      { key: 'action_name', label: 'Action Name', type: 'text', required: true },
      { key: 'next_status_code', label: 'Next Status Code', type: 'text' },
      { key: 'requires_remarks', label: 'Requires remarks', type: 'checkbox' },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },
  {
    key: 'actor-types',
    label: 'Actor Types',
    title: 'Actor Types',
    description: 'Manage actor roles used by workflow steps and assignments.',
    createLabel: 'Create Actor Type',
    emptyIcon: 'groups',
    hasStatus: true,
    columns: [
      { key: 'number', label: 'No.', width: '72px', align: 'center' },
      { key: 'code', label: 'Actor Code', width: '180px' },
      { key: 'name', label: 'Actor Name', width: '260px' },
      { key: 'description', label: 'Description', width: '320px' },
      { key: 'status', label: 'Status', width: '120px', align: 'center' },
      { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
    ],
    fields: [
      { key: 'actor_code', label: 'Actor Code', type: 'text', required: true },
      { key: 'actor_name', label: 'Actor Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },
  {
    key: 'actor-assignments',
    label: 'Actor Assignments',
    title: 'Actor Assignments',
    description: 'Assign workflow actors to staff, roles, or job title rules.',
    createLabel: 'Create Assignment',
    emptyIcon: 'assignment_ind',
    hasStatus: true,
    columns: [
      { key: 'number', label: 'No.', width: '72px', align: 'center' },
      { key: 'process', label: 'Process', width: '180px' },
      { key: 'actor', label: 'Actor', width: '180px' },
      { key: 'assignment', label: 'Assignment', width: '260px' },
      { key: 'permissions', label: 'Permissions', width: '150px' },
      { key: 'status', label: 'Status', width: '120px', align: 'center' },
      { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
    ],
    fields: [
      { key: 'workflow_process_id', label: 'Process', type: 'select', optionSource: 'processes', required: true },
      { key: 'actor_type_id', label: 'Actor Type', type: 'select', optionSource: 'actorTypes', required: true },
      { key: 'assignment_type', label: 'Assignment Type', type: 'select', optionSource: 'assignmentTypes', required: true },
      { key: 'staff_id', label: 'Staff', type: 'select', optionSource: 'staff' },
      { key: 'role_id', label: 'Role', type: 'select', optionSource: 'roles' },
      { key: 'job_title_keyword', label: 'Job Title Keyword', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'can_view', label: 'Can view', type: 'checkbox' },
      { key: 'can_act', label: 'Can act', type: 'checkbox' },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },
  {
    key: 'delegations',
    label: 'Workflow Delegations',
    title: 'Workflow Delegations',
    description: 'Delegate workflow authority between staff for a date range.',
    createLabel: 'Create Delegation',
    emptyIcon: 'swap_horiz',
    hasStatus: true,
    columns: [
      { key: 'number', label: 'No.', width: '72px', align: 'center' },
      { key: 'process', label: 'Process', width: '180px' },
      { key: 'actor', label: 'Actor', width: '170px' },
      { key: 'staff', label: 'Staff Delegation', width: '280px' },
      { key: 'dates', label: 'Dates', width: '190px' },
      { key: 'status', label: 'Status', width: '120px', align: 'center' },
      { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
    ],
    fields: [
      { key: 'workflow_process_id', label: 'Process', type: 'select', optionSource: 'processes', required: true },
      { key: 'actor_type_id', label: 'Actor Type', type: 'select', optionSource: 'actorTypes', required: true },
      { key: 'delegator_staff_id', label: 'Delegator Staff', type: 'select', optionSource: 'staff' },
      { key: 'delegate_staff_id', label: 'Delegate Staff', type: 'select', optionSource: 'staff', required: true },
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date' },
      { key: 'reason', label: 'Reason', type: 'textarea' },
      { key: 'can_view', label: 'Can view', type: 'checkbox' },
      { key: 'can_act', label: 'Can act', type: 'checkbox' },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },
];

@Component({
  selector: 'app-workflow-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    DetailPanelSkeletonComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './workflow.component.html',
  styleUrls: ['../forms/forms.component.scss', './workflow.component.scss'],
})
export class WorkflowComponent implements OnInit {
  private readonly workflowService = inject(WorkflowService);
  private readonly toastService = inject(ToastService);
  private readonly loadedOptionSources = new Set<OptionSource>();

  readonly tabs = TABS;
  readonly activeTabKey = signal<WorkflowTabKey>('processes');
  readonly activeTab = computed(() => this.tabs.find((tab) => tab.key === this.activeTabKey()) ?? this.tabs[0]);

  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly searchTerm = signal('');
  readonly selectedStatus = signal<StatusFilter>('');
  readonly appliedSearch = signal('');
  readonly appliedStatus = signal<StatusFilter>('');
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  readonly forms = signal<FormOption[]>([]);
  readonly processes = signal<WorkflowProcess[]>([]);
  readonly actorTypes = signal<WorkflowActorType[]>([]);
  readonly steps = signal<WorkflowStep[]>([]);
  readonly roles = signal<RoleOption[]>([]);
  readonly staff = signal<StaffOption[]>([]);

  readonly dialogMode = signal<DialogMode | null>(null);
  readonly selectedRow = signal<Record<string, unknown> | null>(null);
  readonly formModel = signal<Record<string, unknown>>({});
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly isSaving = signal(false);
  readonly rowToDelete = signal<Record<string, unknown> | null>(null);

  readonly rowTrackFn: TrackByFunction<unknown> = (_index, row) =>
    (row as Record<string, unknown>)['id'] as number;

  ngOnInit(): void {
    this.loadOptionsForTab('processes').subscribe();
    this.loadRows();
  }

  setTab(tab: WorkflowTabKey): void {
    if (tab === this.activeTabKey()) return;
    this.activeTabKey.set(tab);
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.appliedSearch.set('');
    this.appliedStatus.set('');
    this.page.set(1);
    this.loadOptionsForTab(tab).subscribe();
    this.loadRows();
  }

  loadOptionsForTab(tab: WorkflowTabKey = this.activeTabKey(), force = false): Observable<unknown[]> {
    const sources = this.optionSourcesForTab(tab).filter(
      (source) => source !== 'assignmentTypes' && (force || !this.loadedOptionSources.has(source)),
    );
    if (sources.length === 0) return of([]);
    return forkJoin(sources.map((source) => this.loadOptionSource(source))).pipe(map(() => []));
  }

  loadRows(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.workflowService
      .list<Record<string, unknown>>(this.activeTabKey(), {
        page: this.page(),
        perPage: this.pageSize,
        search: this.appliedSearch(),
        status: this.activeTab().hasStatus ? this.appliedStatus() : '',
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const pagination = response.data.pagination;
          if (pagination.total_pages > 0 && this.page() > pagination.total_pages) {
            this.page.set(pagination.total_pages);
            this.loadRows();
            return;
          }
          this.rows.set(response.data.items);
          this.totalItems.set(pagination.total_items);
          this.totalPages.set(Math.max(1, pagination.total_pages));
          this.toastService.success(response.message);
        },
        error: () => {
          this.rows.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
          this.loadFailed.set(true);
        },
      });
  }

  search(): void {
    this.appliedSearch.set(this.searchTerm().trim());
    this.appliedStatus.set(this.selectedStatus());
    this.page.set(1);
    this.loadRows();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.appliedSearch.set('');
    this.appliedStatus.set('');
    this.page.set(1);
    this.loadRows();
  }

  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.loadRows();
  }

  openCreateDialog(): void {
    this.selectedRow.set(null);
    this.detailFailed.set(false);
    this.formModel.set(this.defaultModel());
    this.isDetailLoading.set(false);
    this.dialogMode.set('create');
  }

  openEditDialog(row: Record<string, unknown>): void {
    const id = Number(row['id']);
    this.selectedRow.set(row);
    this.dialogMode.set('edit');
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.workflowService
      .get<Record<string, unknown>>(this.activeTabKey(), id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.selectedRow.set(response.data);
          this.formModel.set(this.modelFromRow(response.data));
        },
        error: () => this.detailFailed.set(true),
      });
  }

  retryDetail(): void {
    const row = this.selectedRow();
    if (row) this.openEditDialog(row);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.dialogMode.set(null);
    this.selectedRow.set(null);
    this.detailFailed.set(false);
  }

  save(): void {
    const mode = this.dialogMode();
    if (!mode || this.isSaving() || !this.isValid()) return;

    const payload = this.payloadFromModel();
    const request =
      mode === 'create'
        ? this.workflowService.create<Record<string, unknown>>(this.activeTabKey(), payload)
        : this.workflowService.update<Record<string, unknown>>(
            this.activeTabKey(),
            Number(this.selectedRow()!['id']),
            payload,
          );

    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialogMode.set(null);
        this.selectedRow.set(null);
        this.page.set(1);
        this.loadedOptionSources.clear();
        this.loadOptionsForTab(this.activeTabKey()).subscribe();
        this.loadRows();
      },
    });
  }

  openDeleteDialog(row: Record<string, unknown>): void {
    this.rowToDelete.set(row);
  }

  closeDeleteDialog(): void {
    if (this.isSaving()) return;
    this.rowToDelete.set(null);
  }

  confirmDelete(): void {
    const row = this.rowToDelete();
    if (!row || this.isSaving()) return;

    this.isSaving.set(true);
    this.workflowService
      .delete<Record<string, unknown>>(this.activeTabKey(), Number(row['id']))
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.rowToDelete.set(null);
          this.loadedOptionSources.clear();
          this.loadOptionsForTab(this.activeTabKey()).subscribe();
          this.loadRows();
        },
      });
  }

  setField(key: string, value: unknown): void {
    this.formModel.update((model) => ({ ...model, [key]: value }));
  }

  optionList(field: WorkflowField): DropdownOption<string | number>[] {
    switch (field.optionSource) {
      case 'forms':
        return this.forms().map((form) => ({
          value: form.id,
          label: form.form_name,
          description: form.form_code,
          searchText: `${form.form_code} ${form.form_name}`,
        }));
      case 'processes':
        return this.processes().map((process) => ({
          value: process.id,
          label: process.workflow_code,
          description: process.workflow_name,
          searchText: `${process.workflow_code} ${process.workflow_name} ${process.form_code}`,
        }));
      case 'actorTypes':
        return this.actorTypes().map((actor) => ({
          value: actor.id,
          label: actor.actor_code,
          description: actor.actor_name,
          searchText: `${actor.actor_code} ${actor.actor_name}`,
        }));
      case 'steps':
        return this.steps().map((step) => ({
          value: step.id,
          label: step.step_code,
          description: step.step_name,
          searchText: `${step.step_code} ${step.step_name} ${step.status_code}`,
        }));
      case 'roles':
        return this.roles().map((role) => ({
          value: role.id,
          label: role.role_name,
          description: role.role_code,
          searchText: `${role.role_name} ${role.role_code}`,
        }));
      case 'staff':
        return this.staff().map((staff) => ({
          value: staff.username,
          label: staff.fullname || staff.username,
          description: [staff.username, staff.email || staff.staff_email, staff.department]
            .filter(Boolean)
            .join(' | '),
          searchText: [staff.username, staff.fullname, staff.email, staff.staff_email, staff.department]
            .filter(Boolean)
            .join(' '),
        }));
      case 'assignmentTypes':
        return [
          { value: 'STAFF', label: 'Staff' },
          { value: 'ROLE', label: 'Role' },
          { value: 'JOB_TITLE', label: 'Job Title' },
        ];
      default:
        return [];
    }
  }

  value(row: Record<string, unknown>, key: string): unknown {
    return row[key];
  }

  displayCell(row: Record<string, unknown>, key: string): string {
    switch (key) {
      case 'form':
        return [row['form_code'], row['form_name']].filter(Boolean).join(' - ') || 'N/A';
      case 'process':
        return this.processLabel(Number(row['workflow_process_id']));
      case 'step':
        return row['step_code']
          ? `${row['step_no'] ?? ''}. ${row['step_code']} - ${row['step_name'] ?? ''}`.trim()
          : this.stepLabel(Number(row['workflow_step_id']));
      case 'actor':
        return [row['actor_code'], row['actor_name']].filter(Boolean).join(' - ') || 'N/A';
      case 'code':
        return String(row['workflow_code'] ?? row['actor_code'] ?? row['action_code'] ?? '');
      case 'name':
        return String(row['workflow_name'] ?? row['actor_name'] ?? row['action_name'] ?? '');
      case 'version':
        return String(row['version_no'] ?? '');
      case 'statusCode':
        return String(row['status_code'] ?? '');
      case 'nextStatus':
        return String(row['next_status_code'] ?? 'No transition');
      case 'description':
        return String(row['description'] ?? 'No description');
      case 'flags':
        return [
          row['is_required'] ? 'Required' : null,
          row['is_final_step'] ? 'Final' : null,
        ]
          .filter(Boolean)
          .join(', ') || 'Optional';
      case 'assignment':
        return this.assignmentLabel(row);
      case 'permissions':
        return [row['can_view'] ? 'View' : null, row['can_act'] ? 'Act' : null].filter(Boolean).join(', ') || 'None';
      case 'staff':
        return `${row['delegator_staff_id'] || 'Any'} -> ${row['delegate_staff_id'] || 'N/A'}`;
      case 'dates':
        return [row['start_date'], row['end_date'] || 'No end'].filter(Boolean).join(' to ');
      default:
        return String(row[key] ?? '');
    }
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize + index + 1;
  }

  pageStart(): number {
    return this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1;
  }

  pageEnd(): number {
    return Math.min(this.pageStart() + this.rows().length - 1, this.totalItems());
  }

  dialogTitle(): string {
    return `${this.dialogMode() === 'create' ? 'Create' : 'Edit'} ${this.singularTitle()}`;
  }

  deleteTitle(): string {
    return `Delete ${this.singularTitle()}`;
  }

  private defaultModel(): Record<string, unknown> {
    const model: Record<string, unknown> = {};
    for (const field of this.activeTab().fields) {
      if (field.type === 'checkbox') {
        model[field.key] = true;
      } else if (field.type === 'number') {
        model[field.key] = field.key === 'version_no' ? 1 : 0;
      } else {
        model[field.key] = null;
      }
    }
    if (this.activeTabKey() === 'step-actions') model['requires_remarks'] = false;
    if (this.activeTabKey() === 'steps') {
      model['is_required'] = true;
      model['is_final_step'] = false;
      model['display_order'] = 0;
    }
    return model;
  }

  private modelFromRow(row: Record<string, unknown>): Record<string, unknown> {
    const model = this.defaultModel();
    for (const field of this.activeTab().fields) {
      model[field.key] = row[field.key] ?? model[field.key];
    }
    return model;
  }

  private payloadFromModel(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const field of this.activeTab().fields) {
      const value = this.formModel()[field.key];
      if (field.type === 'number') {
        payload[field.key] = value === null || value === '' ? null : Number(value);
      } else if (typeof value === 'string') {
        payload[field.key] = value.trim() || null;
      } else {
        payload[field.key] = value;
      }
    }
    return payload;
  }

  private isValid(): boolean {
    return this.activeTab().fields.every((field) => {
      if (!field.required) return true;
      const value = this.formModel()[field.key];
      return value !== null && value !== undefined && String(value).trim() !== '';
    });
  }

  private processLabel(processId: number): string {
    const process = this.processes().find((item) => item.id === processId);
    return process ? `${process.workflow_code} - ${process.workflow_name}` : String(processId || 'N/A');
  }

  private stepLabel(stepId: number): string {
    const step = this.steps().find((item) => item.id === stepId);
    return step ? `${step.step_code} - ${step.step_name}` : String(stepId || 'N/A');
  }

  private assignmentLabel(row: Record<string, unknown>): string {
    const type = String(row['assignment_type'] ?? '');
    if (type === 'STAFF') return String(row['staff_id'] ?? 'No staff');
    if (type === 'ROLE') return [row['role_code'], row['role_name']].filter(Boolean).join(' - ') || 'No role';
    if (type === 'JOB_TITLE') return String(row['job_title_keyword'] ?? 'No keyword');
    return type || 'N/A';
  }

  private singularTitle(): string {
    const titles: Record<WorkflowTabKey, string> = {
      processes: 'Process',
      steps: 'Step',
      'step-actions': 'Step Action',
      'actor-types': 'Actor Type',
      'actor-assignments': 'Actor Assignment',
      delegations: 'Workflow Delegation',
    };
    return titles[this.activeTabKey()];
  }

  private optionSourcesForTab(tabKey: WorkflowTabKey): OptionSource[] {
    const tab = this.tabs.find((item) => item.key === tabKey);
    if (!tab) return [];
    return Array.from(
      new Set(
        tab.fields
          .map((field) => field.optionSource)
          .filter((source): source is OptionSource => Boolean(source)),
      ),
    );
  }

  private loadOptionSource(source: OptionSource): Observable<unknown> {
    switch (source) {
      case 'forms':
        return this.workflowService.listForms().pipe(
          tap((response) => {
            this.forms.set(response.data);
            this.loadedOptionSources.add(source);
          }),
        );
      case 'processes':
        return this.workflowService
          .list<WorkflowProcess>('processes', {
            page: 1,
            perPage: 100,
            status: 'Active',
          })
          .pipe(
            tap((response) => {
              this.processes.set(response.data.items);
              this.loadedOptionSources.add(source);
            }),
          );
      case 'actorTypes':
        return this.workflowService
          .list<WorkflowActorType>('actor-types', {
            page: 1,
            perPage: 100,
            status: 'Active',
          })
          .pipe(
            tap((response) => {
              this.actorTypes.set(response.data.items);
              this.loadedOptionSources.add(source);
            }),
          );
      case 'steps':
        return this.workflowService
          .list<WorkflowStep>('steps', {
            page: 1,
            perPage: 200,
          })
          .pipe(
            tap((response) => {
              this.steps.set(response.data.items);
              this.loadedOptionSources.add(source);
            }),
          );
      case 'roles':
        return this.workflowService.listRoles().pipe(
          tap((response) => {
            this.roles.set(response.data.items);
            this.loadedOptionSources.add(source);
          }),
        );
      case 'staff':
        return this.workflowService.listStaff().pipe(
          tap((response) => {
            this.staff.set(response.data.items);
            this.loadedOptionSources.add(source);
          }),
        );
      case 'assignmentTypes':
        this.loadedOptionSources.add(source);
        return of(null);
    }
  }
}
