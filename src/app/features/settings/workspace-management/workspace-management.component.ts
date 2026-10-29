import { Component, OnInit, TrackByFunction, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { WorkspaceService, ManagedWorkspace } from '../../../core/services/workspace.service';
import { ToastService } from '../../../core/services/toast.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';

@Component({
  standalone: true,
  imports: [FormsModule, DataTableComponent, DialogComponent, PaginationComponent, TableActionIconComponent],
  templateUrl: './workspace-management.component.html',
  styleUrls: ['../forms/forms.component.scss', './workspace-management.component.scss'],
})
export class WorkspaceManagementComponent implements OnInit {
  private readonly service = inject(WorkspaceService);
  private readonly toast = inject(ToastService);
  readonly rows = signal<ManagedWorkspace[]>([]);
  readonly failed = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly creating = signal(false);
  readonly editing = signal<ManagedWorkspace | null>(null);
  readonly searchTerm = signal('');
  readonly selectedStatus = signal('');
  readonly appliedSearch = signal('');
  readonly appliedStatus = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 30, 50];
  readonly filtered = computed(() => this.rows().filter(row => {
    const term = this.appliedSearch().toLowerCase();
    return (!term || [row.code, row.name, row.domain_url || ''].some(value => value.toLowerCase().includes(term)))
      && (!this.appliedStatus() || row.is_active === (this.appliedStatus() === 'Active'));
  }));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  readonly visible = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()));
  search(): void { this.appliedSearch.set(this.searchTerm().trim()); this.appliedStatus.set(this.selectedStatus()); this.page.set(1); }
  resetFilters(): void { this.searchTerm.set(''); this.selectedStatus.set(''); this.search(); }
  onPageSizeChange(size: number): void { this.pageSize.set(size); this.page.set(1); }
  readonly columns: readonly DataTableColumn[] = [
    {key:'number',label:'No.',width:'72px',align:'center'},
    {key:'code',label:'Workspace Code',width:'190px'},
    {key:'name',label:'Workspace Name',width:'230px'},
    {key:'url',label:'Domain URL',width:'300px'},
    {key:'order',label:'Display Order',width:'120px',align:'center'},
    {key:'status',label:'Status',width:'120px',align:'center'},
    {key:'actions',label:'Actions',width:'120px',align:'center',headerAlign:'center'},
  ];
  readonly track: TrackByFunction<unknown> = (_index, row) => (row as ManagedWorkspace).id;
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true); this.failed.set(false);
    this.service.managed().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => { this.rows.set(response.data); this.page.set(Math.min(this.page(), this.totalPages())); }, error: () => this.failed.set(true),
    });
  }
  create(): void {
    this.creating.set(true);
    this.editing.set({id:0,code:'',name:'',domain_url:null,is_active:true,display_order: Math.max(0, ...this.rows().map(row => row.display_order)) + 1});
  }
  edit(row: ManagedWorkspace): void { this.creating.set(false); this.editing.set({...row}); }
  close(): void { if (!this.saving()) this.editing.set(null); }
  isValid(row: ManagedWorkspace | null): row is ManagedWorkspace {
    return !!row && (!this.creating() || /^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(row.code.trim())) && !!row.name.trim() && Number.isInteger(row.display_order) && row.display_order >= 0 && row.display_order <= 2147483647;
  }
  save(): void {
    const row = this.editing();
    if (!this.isValid(row) || this.saving()) return;
    this.saving.set(true);
    const payload = {name:row.name.trim(), domain_url:row.domain_url?.trim() || null,
      is_active:row.is_active, display_order:row.display_order};
    const request = this.creating() ? this.service.createSettings({...payload, code:row.code.trim().toUpperCase()}) : this.service.saveSettings(row.id, payload);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({next: () => {
        this.editing.set(null); this.page.set(1); this.toast.success(this.creating() ? 'Workspace created' : 'Workspace updated'); this.load();
        this.service.load(true).subscribe({error: () => undefined});
      }});
  }
}
