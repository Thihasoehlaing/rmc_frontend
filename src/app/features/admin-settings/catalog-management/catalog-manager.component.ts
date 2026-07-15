import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AddOptionModalComponent,
  AddOptionPayload,
} from '../../../shared/components/add-option-modal/add-option-modal.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SubmissionsSearchComponent } from '../../../shared/components/submissions-search/submissions-search.component';
import { TableActionIconComponent } from '../../../shared/components/table-action-icon/table-action-icon.component';
import { ToastService } from '../../../core/services/toast.service';
import {
  AdminCatalogItem,
  AdminCatalogKind,
  AdminCatalogStoreService,
} from './admin-catalog-store.service';

@Component({
  selector: 'app-catalog-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ActionButtonComponent,
    AddOptionModalComponent,
    DialogComponent,
    PaginationComponent,
    SubmissionsSearchComponent,
    TableActionIconComponent,
  ],
  providers: [DatePipe],
  templateUrl: './catalog-manager.component.html',
  styleUrls: [
    '../dropdowns/shared/form-dropdown-options-manager.component.scss',
    './catalog-manager.component.scss',
  ],
})
export class CatalogManagerComponent {
  @Input({ required: true }) kind!: AdminCatalogKind;
  @Input({ required: true }) title = '';
  @Input({ required: true }) subtitle = '';
  @Input() allowAdd = true;
  @Input() showCode = false;
  @Input() showSharedWith = false;
  @Input() codeLabel = 'Code';
  @Input() nameLabel = 'Category Name';

  private readonly store = inject(AdminCatalogStoreService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);

  readonly availableForms = ['Conference Application', 'Journal Application'];
  readonly searchQuery = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 30, 50];
  readonly showModal = signal(false);
  readonly editingRow = signal<AdminCatalogItem | null>(null);
  readonly rowToDelete = signal<AdminCatalogItem | null>(null);
  readonly sharedFormsDialog = signal<{ itemName: string; forms: string[] } | null>(null);

  readonly filteredRows = computed(() => {
    const query = this.searchQuery().toLocaleLowerCase();
    const status = this.statusFilter();
    return this.store
      .items()
      .filter((item) => item.kind === this.kind)
      .filter((item) => status === 'all' || item.status.toLocaleLowerCase() === status)
      .filter((item) =>
        !query ? true : `${item.code ?? ''} ${item.name}`.toLocaleLowerCase().includes(query),
      );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())),
  );
  readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });

  goBack(): void {
    this.router.navigate(['/admin-settings']);
  }

  openAddModal(): void {
    if (!this.allowAdd) return;
    this.editingRow.set(null);
    this.showModal.set(true);
  }

  editRow(row: AdminCatalogItem): void {
    this.editingRow.set(row);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRow.set(null);
  }

  modalInitial(): AddOptionPayload | null {
    const row = this.editingRow();
    return row
      ? {
          code: row.code,
          name: row.name,
          status: row.status,
          appliesTo: row.appliesTo,
        }
      : null;
  }

  saveModal(payload: AddOptionPayload): void {
    const input = {
      code: payload.code,
      name: payload.name,
      status: payload.status,
      appliesTo: payload.appliesTo,
    };
    const row = this.editingRow();
    if (row) {
      this.store.update(row.id, input);
    } else {
      this.store.create(this.kind, input);
    }
    this.toast.success(row ? 'Option updated.' : 'Option added.');
    this.closeModal();
    this.ensureValidPage();
  }

  toggleStatus(row: AdminCatalogItem): void {
    this.store.toggleStatus(row.id);
    this.toast.success(`${row.name} ${row.status === 'Active' ? 'deactivated' : 'activated'}.`);
  }

  openSharedForms(row: AdminCatalogItem): void {
    this.sharedFormsDialog.set({
      itemName: row.code ? `${row.code} - ${row.name}` : row.name,
      forms: [...row.appliesTo],
    });
  }

  confirmDelete(): void {
    const row = this.rowToDelete();
    if (!row) return;
    this.store.delete(row.id);
    this.rowToDelete.set(null);
    this.toast.success('Option deleted.');
    this.ensureValidPage();
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
  }

  onReset(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.page.set(1);
  }

  onStatusChange(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
    this.page.set(1);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
  }

  formatDateTime(value: string): string {
    return this.datePipe.transform(value, 'yyyy-MM-dd\nhh:mm:ss a') ?? '-';
  }

  private ensureValidPage(): void {
    this.page.set(Math.min(this.page(), this.totalPages()));
  }
}
