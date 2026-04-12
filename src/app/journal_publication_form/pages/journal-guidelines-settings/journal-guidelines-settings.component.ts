import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JournalGuidelinesService, JournalGuideline } from '../../services/journal-guidelines.service';

@Component({
  selector: 'app-journal-guidelines-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './journal-guidelines-settings.component.html',
  styleUrl: './journal-guidelines-settings.component.scss'
})
export class JournalGuidelinesSettingsComponent implements OnInit {
  private guidelinesService = inject(JournalGuidelinesService);
  private fb = inject(FormBuilder);

  guidelines = signal<JournalGuideline[]>([]);
  form!: FormGroup;
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  selectedCheckboxes = signal<Set<string>>(new Set());

  // Filter signals
  searchQuery = signal<string>('');
  filterStatus = signal<'All' | 'Active' | 'Inactive'>('All');
  sortBy = signal<'date' | 'title'>('date');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Computed signal for filtered list
  filteredGuidelines = computed(() => {
    let result = [...this.guidelines()];

    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(g =>
        g.title.toLowerCase().includes(query) ||
        g.sectionName.toLowerCase().includes(query) ||
        g.formName.toLowerCase().includes(query)
      );
    }

    const status = this.filterStatus();
    if (status !== 'All') {
      result = result.filter(g => g.status === status);
    }

    // Apply sorting
    const sort = this.sortBy();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
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

  get hasSelectedCheckboxes(): boolean {
      return this.selectedCheckboxes().size > 0;
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterStatus.set(select.value as 'All' | 'Active' | 'Inactive');       
  }

  onSortChange(column: 'date' | 'title') {
    if (this.sortBy() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortDirection.set('asc');
    }  }

  ngOnInit() {
    this.loadGuidelines();    this.form = this.fb.group({
      title: ['', Validators.required],
      formName: ['Journal Publication Form', Validators.required],
      sectionName: ['General', Validators.required],
      content: ['', Validators.required],
      status: ['Active', Validators.required]
    });
  }

  loadGuidelines() {
    this.guidelines.set(this.guidelinesService.getAll());
  }

  openAddModal() {
    this.editingId.set(null);
    this.form.reset({ formName: 'Journal Publication Form', sectionName: 'General', status: 'Active' });
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
      this.guidelinesService.updateGuideline(this.editingId()!, { ...val, id: this.editingId()!, createdDate: new Date().toISOString() });
    } else {
      this.guidelinesService.addGuideline({ ...val, id: Date.now().toString(), createdDate: new Date().toISOString() });
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
      this.selectedCheckboxes().forEach(checkboxId => this.guidelinesService.deleteGuideline(checkboxId));
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