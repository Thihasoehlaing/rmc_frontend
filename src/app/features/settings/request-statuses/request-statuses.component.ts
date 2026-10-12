import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { DropdownOption } from '../../../core/interfaces/components.interface';
import { CachedFormOption, FormCacheService } from '../../../core/services/form-cache.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import {
  ActorTypeOption,
  RequestStatusPayload,
  RequestStatusSetting,
  RequestStatusesService,
} from './request-statuses.service';

type DialogMode = 'create' | 'edit';

interface RequestStatusEditorModel {
  form_id: number | null;
  status_code: string;
  status_name: string;
  actor_type_id: number | null;
  is_initial: boolean;
  is_final: boolean;
  display_order: number;
  is_active: boolean;
}

const COLUMNS: readonly DataTableColumn[] = [
  { key: 'number', label: 'No.', width: '72px', align: 'center', headerAlign: 'center' },
  { key: 'form', label: 'Form', width: '230px' },
  { key: 'statusCode', label: 'Status Code', width: '220px' },
  { key: 'statusName', label: 'Status Name', width: '260px' },
  { key: 'actor', label: 'Actor', width: '220px' },
  { key: 'flags', label: 'Flags', width: '150px', align: 'center', headerAlign: 'center' },
  { key: 'order', label: 'Order', width: '90px', align: 'center', headerAlign: 'center' },
  { key: 'status', label: 'Status', width: '120px', align: 'center', headerAlign: 'center' },
  { key: 'actions', label: 'Actions', width: '120px', align: 'center', headerAlign: 'center' },
];

@Component({
  selector: 'app-request-statuses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    SearchableDropdownComponent,
    TableActionIconComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './request-statuses.component.html',
  styleUrls: ['../forms/forms.component.scss', '../settings-tables.scss', './request-statuses.component.scss'],
})
export class RequestStatusesComponent implements OnInit {
  private readonly requestStatusesService = inject(RequestStatusesService);
  private readonly formCache = inject(FormCacheService);

  readonly columns = COLUMNS;
  readonly rows = signal<RequestStatusSetting[]>([]);
  readonly forms = signal<CachedFormOption[]>([]);
  readonly actorTypes = signal<ActorTypeOption[]>([]);
  readonly searchTerm = signal('');
  readonly selectedStatus = signal<'' | 'Active' | 'Inactive'>('');
  readonly selectedFormCode = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly dialogMode = signal<DialogMode | null>(null);
  readonly selectedRow = signal<RequestStatusSetting | null>(null);
  readonly rowToDelete = signal<RequestStatusSetting | null>(null);
  readonly isDetailLoading = signal(false);
  readonly detailFailed = signal(false);
  readonly formModel = signal<RequestStatusEditorModel>(this.defaultModel());

  readonly rowTrackFn: TrackByFunction<RequestStatusSetting> = (_index, row) => row.id;

  ngOnInit(): void {
    this.loadForms();
    this.loadActorTypes();
    this.loadRows();
  }

  search(): void {
    this.page.set(1);
    this.loadRows();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('');
    this.selectedFormCode.set('');
    this.page.set(1);
    this.loadRows();
  }

  onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.loadRows();
  }

  onPageSizeChange(nextSize: number): void {
    this.pageSize.set(nextSize);
    this.page.set(1);
    this.loadRows();
  }

  loadRows(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.requestStatusesService
      .list({
        page: this.page(),
        perPage: this.pageSize(),
        search: this.searchTerm(),
        status: this.selectedStatus(),
        formCode: this.selectedFormCode(),
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: response => {
          this.rows.set(response.data.items ?? []);
          this.totalItems.set(response.data.pagination?.total_items ?? 0);
          this.totalPages.set(Math.max(1, response.data.pagination?.total_pages ?? 1));
        },
        error: () => {
          this.loadFailed.set(true);
          this.rows.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
        },
      });
  }

  rowNumber(index: number): number {
    return (this.page() - 1) * this.pageSize() + index + 1;
  }

  flagText(row: RequestStatusSetting): string {
    const flags: string[] = [];
    if (row.is_initial) flags.push('Initial');
    if (row.is_final) flags.push('Final');
    return flags.length ? flags.join(', ') : '-';
  }

  openCreateDialog(): void {
    this.selectedRow.set(null);
    this.detailFailed.set(false);
    this.isDetailLoading.set(false);
    this.formModel.set(this.defaultModel());
    this.dialogMode.set('create');
  }

  openEditDialog(row: RequestStatusSetting): void {
    this.selectedRow.set(row);
    this.dialogMode.set('edit');
    this.isDetailLoading.set(true);
    this.detailFailed.set(false);

    this.requestStatusesService
      .get(row.id)
      .pipe(finalize(() => this.isDetailLoading.set(false)))
      .subscribe({
        next: response => {
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
    const request$ =
      mode === 'create'
        ? this.requestStatusesService.create(payload)
        : this.requestStatusesService.update(this.selectedRow()!.id, payload);

    this.isSaving.set(true);
    request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialogMode.set(null);
        this.selectedRow.set(null);
        this.page.set(1);
        this.loadRows();
      },
    });
  }

  openDeleteDialog(row: RequestStatusSetting): void {
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
    this.requestStatusesService
      .delete(row.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.rowToDelete.set(null);
          this.loadRows();
        },
      });
  }

  setField<K extends keyof RequestStatusEditorModel>(key: K, value: RequestStatusEditorModel[K]): void {
    this.formModel.update(model => ({ ...model, [key]: value }));
  }

  formOptions(): DropdownOption<number>[] {
    return this.forms().map(form => ({
      value: form.id,
      label: form.form_name,
      description: form.form_code,
      searchText: `${form.form_code} ${form.form_name}`,
    }));
  }

  actorTypeOptions(): DropdownOption<number>[] {
    return this.actorTypes().map(actor => ({
      value: actor.id,
      label: actor.actor_name,
      description: actor.actor_code,
      searchText: `${actor.actor_code} ${actor.actor_name}`,
    }));
  }

  dialogTitle(): string {
    return this.dialogMode() === 'create' ? 'Create Request Status' : 'Edit Request Status';
  }

  isValid(): boolean {
    const model = this.formModel();
    return Boolean(model.form_id && model.status_code.trim() && model.status_name.trim());
  }

  private loadForms(): void {
    this.formCache.getForms().subscribe({
      next: response => this.forms.set(response.data ?? []),
      error: () => this.forms.set([]),
    });
  }

  private loadActorTypes(): void {
    this.requestStatusesService.listActorTypes().subscribe({
      next: response => this.actorTypes.set(response.data ?? []),
      error: () => this.actorTypes.set([]),
    });
  }

  private defaultModel(): RequestStatusEditorModel {
    return {
      form_id: null,
      status_code: '',
      status_name: '',
      actor_type_id: null,
      is_initial: false,
      is_final: false,
      display_order: 0,
      is_active: true,
    };
  }

  private modelFromRow(row: RequestStatusSetting): RequestStatusEditorModel {
    return {
      form_id: row.form_id,
      status_code: row.status_code,
      status_name: row.status_name,
      actor_type_id: row.actor_type_id,
      is_initial: row.is_initial,
      is_final: row.is_final,
      display_order: row.display_order,
      is_active: row.is_active,
    };
  }

  private payloadFromModel(): RequestStatusPayload {
    const model = this.formModel();
    return {
      form_id: Number(model.form_id),
      status_code: model.status_code.trim().toUpperCase(),
      status_name: model.status_name.trim(),
      actor_type_id: model.actor_type_id ? Number(model.actor_type_id) : null,
      is_initial: model.is_initial,
      is_final: model.is_final,
      display_order: Number(model.display_order) || 0,
      is_active: model.is_active,
    };
  }
}
