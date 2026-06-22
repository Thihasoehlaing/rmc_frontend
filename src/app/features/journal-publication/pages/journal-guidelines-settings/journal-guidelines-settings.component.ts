import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  JournalGuidelinesService,
  JournalGuideline,
} from '../../services/journal-guidelines.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { nextTableSortState, SortDirection } from '../../../../shared/services/table-sort.service';
import { TableActionIconComponent } from '../../../../shared/components/table-action-icon/table-action-icon.component';

@Component({
  selector: 'app-journal-guidelines-settings',
  standalone: true,
  imports: [
    TableActionIconComponent,
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    DataTableComponent,
  ],
  templateUrl: './journal-guidelines-settings.component.html',
  styleUrl: './journal-guidelines-settings.component.scss',
})
export class JournalGuidelinesSettingsComponent implements OnInit {
  private guidelinesService = inject(JournalGuidelinesService);
  private fb = inject(FormBuilder);

  guidelines = signal<JournalGuideline[]>([]);
  form!: FormGroup;
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  selectedCheckboxes = signal<Set<string>>(new Set());

  readonly columns: DataTableColumn[] = [
    {
      key: 'select',
      label: '',
      width: 'var(--size-table-column-number)',
      align: 'center',
      headerAlign: 'center',
    },
    { key: 'title', label: 'Guideline Title', sortable: true },
    { key: 'formName', label: 'Form Name' },
    { key: 'sectionName', label: 'Section Name' },
    { key: 'content', label: 'Content Snippet' },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: 'Actions',
      width: 'var(--size-table-column-actions)',
      align: 'center',
      headerAlign: 'center',
    },
  ];
  // Filter signals
  searchQuery = signal<string>('');
  filterStatus = signal<'All' | 'Active' | 'Inactive'>('All');
  sortBy = signal<'date' | 'title' | null>(null);
  sortDirection = signal<SortDirection>(null);
  guidelinePage = signal(1);
  guidelinePageSize = signal(15);
  guidelinePageSizeOptions = [5, 15, 30, 50];

  // Computed signal for filtered list
  filteredGuidelines = computed(() => {
    let result = [...this.guidelines()];

    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          g.sectionName.toLowerCase().includes(query) ||
          g.formName.toLowerCase().includes(query),
      );
    }

    const status = this.filterStatus();
    if (status !== 'All') {
      result = result.filter((g) => g.status === status);
    }

    // Apply sorting
    const sort = this.sortBy();
    const sortDirection = this.sortDirection();
    if (!sort || !sortDirection) return result;
    const dir = sortDirection === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      if (sort === 'title') {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB) * dir;
      } else {
        const dateA = new Date(a.createdDate || 0).getTime();
        const dateB = new Date(b.createdDate || 0).getTime();
        return (dateA - dateB) * dir;
      }
    });

    return result;
  });

  guidelineTotalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredGuidelines().length / this.guidelinePageSize()));
  });

  paginatedGuidelines = computed(() => {
    const list = this.filteredGuidelines();
    const currentPage = Math.min(this.guidelinePage(), this.guidelineTotalPages());
    const startIndex = (currentPage - 1) * this.guidelinePageSize();
    return list.slice(startIndex, startIndex + this.guidelinePageSize());
  });

  guidelinePageStart = computed(() => {
    const total = this.filteredGuidelines().length;
    if (total === 0) return 0;
    return (
      (Math.min(this.guidelinePage(), this.guidelineTotalPages()) - 1) * this.guidelinePageSize() +
      1
    );
  });

  guidelinePageEnd = computed(() => {
    const total = this.filteredGuidelines().length;
    if (total === 0) return 0;
    return Math.min(this.guidelinePageStart() + this.guidelinePageSize() - 1, total);
  });

  get hasSelectedCheckboxes(): boolean {
    return this.selectedCheckboxes().size > 0;
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.guidelinePage.set(1);
  }

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterStatus.set(select.value as 'All' | 'Active' | 'Inactive');
    this.guidelinePage.set(1);
  }

  onSortChange(column: 'date' | 'title') {
    const next = nextTableSortState(
      { column: this.sortBy(), direction: this.sortDirection() },
      column,
    );
    this.sortBy.set(next.column as 'date' | 'title' | null);
    this.sortDirection.set(next.direction);
    this.guidelinePage.set(1);
  }

  ngOnInit() {
    this.loadGuidelines();
    this.form = this.fb.group({
      title: ['', Validators.required],
      formName: ['Journal Publication Form', Validators.required],
      sectionName: ['General', Validators.required],
      content: ['', Validators.required],
      status: ['Active', Validators.required],
    });
  }

  loadGuidelines() {
    this.guidelines.set(this.guidelinesService.getAll());
    const maxPage = this.guidelineTotalPages();
    if (this.guidelinePage() > maxPage) {
      this.guidelinePage.set(maxPage);
    }
  }

  onGuidelinePageChange(page: number) {
    this.guidelinePage.set(page);
  }

  onGuidelinePageSizeChange(pageSize: number) {
    this.guidelinePageSize.set(pageSize);
    this.guidelinePage.set(1);
  }

  autoExpandTextarea(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  openAddModal() {
    this.editingId.set(null);
    this.form.reset({
      formName: 'Journal Publication Form',
      sectionName: 'General',
      status: 'Active',
    });
    this.isModalOpen.set(true);
  }

  editGuideline(g: JournalGuideline) {
    this.editingId.set(g.id);
    this.form.patchValue(g);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingId.set(null);
    this.form.reset();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    if (this.editingId()) {
      this.guidelinesService.updateGuideline(this.editingId()!, {
        ...val,
        id: this.editingId()!,
        createdDate: new Date().toISOString(),
      });
    } else {
      this.guidelinesService.addGuideline({
        ...val,
        id: crypto.randomUUID(),
        createdDate: new Date().toISOString(),
      });
    }

    this.loadGuidelines();
    this.closeModal();
  }

  deleteSelected(id?: string) {
    if (id) {
      if (confirm('Are you sure you want to delete this guideline?')) {
        this.guidelinesService.deleteGuideline(id);
        this.loadGuidelines();
      }
      return;
    }

    if (confirm('Are you sure you want to delete the selected guidelines?')) {
      this.selectedCheckboxes().forEach((checkboxId) =>
        this.guidelinesService.deleteGuideline(checkboxId),
      );
      this.selectedCheckboxes.set(new Set());
      this.loadGuidelines();
    }
  }

  toggleCheckbox(id: string) {
    const current = new Set(this.selectedCheckboxes());
    current.has(id) ? current.delete(id) : current.add(id);
    this.selectedCheckboxes.set(current);
  }

  isOptionSelected(id: string): boolean {
    return this.selectedCheckboxes().has(id);
  }
}
