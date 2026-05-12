import { Component, signal, TrackByFunction, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddGuidelineModalComponent, GuidelineConfig } from './add-guideline-modal/add-guideline-modal.component';
import { DataTableComponent, DataTableColumn } from '../../shared/components/data-table/data-table.component';
import { AuthService } from '../../services/auth.service';

interface Guideline {
  id: number;
  form: string;
  title: string;
  isActive: boolean;
  config: GuidelineConfig;
  lastUpdated: string;
  createdBy: string;
}

type GuidelineSortKey = 'form' | 'title' | 'blocks' | 'lastUpdated' | 'createdBy';

@Component({
  selector: 'app-guidelines',
  standalone: true,
  imports: [CommonModule, FormsModule, AddGuidelineModalComponent, DataTableComponent],
  templateUrl: './guidelines.component.html',
  styleUrls: ['./guidelines.component.scss'],
})
export class GuidelinesComponent implements OnInit {
  private auth = inject(AuthService);
  private readonly STORAGE_KEY = 'rmc_guidelines_data';

  searchTerm = signal('');
  selectedForm = signal<string>('');
  sortBy = signal<GuidelineSortKey>('form');
  sortDirection = signal<'asc' | 'desc'>('asc');
  showAddModal = signal(false);
  editingGuidelineId = signal<number | null>(null);
  editingConfig = signal<GuidelineConfig | null>(null);

  columns: readonly DataTableColumn[] = [
    { key: 'form', label: 'Form', width: '180px', sortable: true },
    { key: 'title', label: 'Guideline Title', sortable: true },
    { key: 'status', label: 'Status', width: '120px' },
    { key: 'blocks', label: 'Blocks', width: '120px', align: 'center', sortable: true },
    { key: 'lastUpdated', label: 'Last Updated', width: '140px', sortable: true },
    { key: 'createdBy', label: 'Created By', width: '160px', sortable: true },
    { key: 'actions', label: 'Actions', width: '180px', align: 'right', headerAlign: 'right' },
  ];

  rowTrackFn: TrackByFunction<unknown> = (index: number, row: unknown) => (row as Guideline).id;

  guidelines = signal<Guideline[]>([]);

  ngOnInit() {
    this.loadGuidelinesFromStorage();
  }

  private loadGuidelinesFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Array<Partial<Guideline> & Pick<Guideline, 'id' | 'form' | 'title' | 'config' | 'lastUpdated' | 'createdBy'>>;
        this.guidelines.set(
          this.normalizeSingleActivePerForm(
            data.map(item => ({
              ...item,
              isActive: Boolean(item.isActive),
              lastUpdated: this.normalizeDisplayDate(item.lastUpdated),
            })) as Guideline[]
          )
        );
      } else {
        this.guidelines.set(
          this.normalizeSingleActivePerForm(
            this.getDefaultGuidelines().map(item => ({
              ...item,
              lastUpdated: this.normalizeDisplayDate(item.lastUpdated),
            }))
          )
        );
      }
    } catch (error) {
      console.error('Failed to load guidelines from localStorage:', error);
      this.guidelines.set(this.normalizeSingleActivePerForm(this.getDefaultGuidelines()));
    }
  }

  private saveGuidelinesToStorage() {
    try {
      // Persist a normalized copy to ensure only one active guideline per form is stored
      const normalized = this.normalizeSingleActivePerForm(this.guidelines());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
      // Also update the in-memory signal with the normalized list to keep UI consistent
      this.guidelines.set(normalized);
    } catch (error) {
      console.error('Failed to save guidelines to localStorage:', error);
    }
  }

  private getDefaultGuidelines(): Guideline[] {
    return [
      {
        id: 1,
        form: 'Conference Application',
      title: 'Conference Submission Rules 2026',
      isActive: true,
      config: {
        title: 'Conference Submission Rules 2026',
        formName: 'Conference Application',
        backgroundToken: 'white',
        textToken: 'var(--color-text-primary)',
        buttonToken: 'var(--color-primary)',
        buttonText: 'Close',
        blocks: [
          { id: '1-a', type: 'text', content: 'Rule 1: ...' },
          { id: '1-b', type: 'text', content: 'Rule 2: ...' },
        ],
      },
      lastUpdated: '01 Mar 2026',
      createdBy: 'Prof. Zulkifli',
    },
    {
      id: 2,
      form: 'Journal Application',
      title: 'Journal Manuscript Guidelines',
      isActive: true,
      config: {
        title: 'Journal Manuscript Guidelines',
        formName: 'Journal Application',
        backgroundToken: 'white',
        textToken: 'var(--color-text-primary)',
        buttonToken: 'var(--color-primary)',
        buttonText: 'Close',
        blocks: [
          { id: '2-a', type: 'text', content: 'Manuscript length...' },
          { id: '2-b', type: 'highlight', content: 'Formatting notes...' },
          { id: '2-c', type: 'info', content: 'Submission portal...' },
        ],
      },
      lastUpdated: '15 Feb 2026',
      createdBy: 'Ahmad Azri',
    },
    {
      id: 3,
      form: 'Partnership Application',
      title: 'Partnership Proposal Checklist',
      isActive: true,
      config: {
        title: 'Partnership Proposal Checklist',
        formName: 'Partnership Application',
        backgroundToken: 'white',
        textToken: 'var(--color-text-primary)',
        buttonToken: 'var(--color-primary)',
        buttonText: 'Close',
        blocks: [
          { id: '3-a', type: 'text', content: 'Checklist item 1' },
          { id: '3-b', type: 'text', content: 'Checklist item 2' },
          { id: '3-c', type: 'text', content: 'Checklist item 3' },
        ],
      },
      lastUpdated: '28 Jan 2026',
      createdBy: 'Pn. Fauziah',
    },
    {
      id: 4,
      form: 'RA/GRA Application',
      title: 'RA/GRA Application Requirements',
      isActive: true,
      config: {
        title: 'RA/GRA Application Requirements',
        formName: 'RA/GRA Application',
        backgroundToken: 'white',
        textToken: 'var(--color-text-primary)',
        buttonToken: 'var(--color-primary)',
        buttonText: 'Close',
        blocks: [
          { id: '4-a', type: 'text', content: 'Requirement A' },
          { id: '4-b', type: 'text', content: 'Requirement B' },
          { id: '4-c', type: 'text', content: 'Requirement C' },
        ],
      },
      lastUpdated: '05 Apr 2026',
      createdBy: 'Pn. Rohani',
    },
    {
      id: 5,
      form: 'RDIG Application',
      title: 'RDIG Submission Guidelines v2.1',
      isActive: true,
      config: {
        title: 'RDIG Submission Guidelines v2.1',
        formName: 'RDIG Application',
        backgroundToken: 'white',
        textToken: 'var(--color-text-primary)',
        buttonToken: 'var(--color-primary)',
        buttonText: 'Close',
        blocks: [
          { id: '5-a', type: 'text', content: 'Step 1' },
          { id: '5-b', type: 'text', content: 'Step 2' },
          { id: '5-c', type: 'highlight', content: 'Important' },
          { id: '5-d', type: 'info', content: 'Notes' },
        ],
      },
      lastUpdated: '10 Apr 2026',
      createdBy: 'Dr. Suhaimi',
    },
    ];
  }

  uniqueForms(): string[] {
    const forms = [...new Set(this.guidelines().map(g => g.form))];
    return forms.sort();
  }

  filteredGuidelines() {
    // Ensure only one guideline is active per form at runtime
    const normalizedList = this.normalizeSingleActivePerForm(this.guidelines());

    // search by title and createdBy
    const searchLower = this.searchTerm().toLowerCase();
    let list = normalizedList.filter(g => {
      const matchesSearch = g.title.toLowerCase().includes(searchLower) ||
                           g.createdBy.toLowerCase().includes(searchLower);
      const matchesForm = !this.selectedForm() || g.form === this.selectedForm();
      return matchesSearch && matchesForm;
    });

    // apply sorting
    const sortKey = this.sortBy();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      return this.compareGuidelines(a, b, sortKey) * dir;
    });

    return list;
  }

  onSortChange(columnKey: string) {
    // toggle sort if same column
    if (this.sortBy() === columnKey) {
      this.sortDirection.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(columnKey as GuidelineSortKey);
      this.sortDirection.set('asc');
    }
  }

  addGuideline() {
    this.editingGuidelineId.set(null);
    this.editingConfig.set(null);
    this.showAddModal.set(true);
  }

  closeModal() {
    this.showAddModal.set(false);
  }

  saveGuideline(config: GuidelineConfig) {
    const now = this.formatDisplayDate(new Date());

    const currentUserName = this.auth.currentUser()?.name ?? 'Unknown';

    if (this.editingGuidelineId()) {
      // update existing
      const id = this.editingGuidelineId() as number;
      this.guidelines.update(list =>
        this.normalizeSingleActivePerForm(
          list.map(g => g.id === id ? {
            ...g,
            form: config.formName,
            title: config.title,
            isActive: true,
            config: config,
            lastUpdated: now,
            createdBy: currentUserName,
          } : g)
        )
      );
    } else {
      const newGuideline: Guideline = {
        id: Math.max(...this.guidelines().map(g => g.id), 0) + 1,
        form: config.formName,
        title: config.title,
        isActive: true,
        config: config,
        lastUpdated: now,
        createdBy: currentUserName,
      };
      this.guidelines.update(guidelines =>
        this.normalizeSingleActivePerForm([...guidelines, newGuideline])
      );
    }

    this.editingGuidelineId.set(null);
    this.editingConfig.set(null);
    this.showAddModal.set(false);
    this.saveGuidelinesToStorage();
  }

  activateGuideline(id: number) {
    this.guidelines.update(guidelines =>
      this.normalizeSingleActivePerForm(
        guidelines.map(g => g.id === id ? { ...g, isActive: true } : g)
      )
    );
    this.saveGuidelinesToStorage();
  }

  /**
   * Toggle guideline status between Active and Inactive.
   */
  toggleGuidelineStatus(arg: number | Guideline) {
    const id = typeof arg === 'number' ? arg : arg.id;
    const found = this.guidelines().find(g => g.id === id);
    if (!found) return;

    // Flip the target guideline's isActive and ensure at most one per form
    const updated = this.guidelines().map(g => {
      if (g.id === id) {
        return { ...g, isActive: !g.isActive };
      }
      // If we're activating the target, deactivate others in the same form
      if (!found.isActive && g.form === found.form) {
        return { ...g, isActive: false };
      }
      return g;
    });

    const normalized = this.normalizeSingleActivePerForm(updated);
    this.guidelines.set(normalized);
    this.saveGuidelinesToStorage();
  }

  deleteGuideline(id: number) {
    this.guidelines.update(guidelines =>
      guidelines.filter(g => g.id !== id)
    );
    this.saveGuidelinesToStorage();
  }

  editGuideline(id: number) {
    const found = this.guidelines().find(g => g.id === id);
    if (!found) return;
    this.editingGuidelineId.set(id);
    this.editingConfig.set(found.config);
    this.showAddModal.set(true);
  }

  setSortBy(field: GuidelineSortKey) {
    if (this.sortBy() === field) {
      this.sortDirection.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortDirection.set('asc');
    }
  }

  private compareGuidelines(a: Guideline, b: Guideline, sortKey: GuidelineSortKey): number {
    if (sortKey === 'blocks') {
      return a.config.blocks.length - b.config.blocks.length;
    }

    if (sortKey === 'lastUpdated') {
      return this.parseDisplayDate(a.lastUpdated) - this.parseDisplayDate(b.lastUpdated);
    }

    return a[sortKey].localeCompare(b[sortKey]);
  }

  private formatDisplayDate(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseDisplayDate(dateValue: string): number {
    const slashMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    }

    const match = dateValue.match(/^(\d{2})\s([A-Za-z]{3})\s(\d{4})$/);
    if (match) {
      const monthLookup: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const [, day, monthText, year] = match;
      const month = monthLookup[monthText];
      if (month !== undefined) {
        return new Date(Number(year), month, Number(day)).getTime();
      }
    }

    const isoParsed = new Date(dateValue).getTime();
    if (!Number.isNaN(isoParsed)) {
      return isoParsed;
    }

    return 0;
  }

  private normalizeDisplayDate(dateValue?: string): string {
    if (!dateValue) {
      return this.formatDisplayDate(new Date());
    }

    const timestamp = this.parseDisplayDate(dateValue);
    if (!timestamp) {
      return this.formatDisplayDate(new Date());
    }

    return this.formatDisplayDate(new Date(timestamp));
  }

  private normalizeSingleActivePerForm(list: Guideline[]): Guideline[] {
    const chosenByForm = new Map<string, number>();

    for (const guideline of list) {
      if (!chosenByForm.has(guideline.form)) {
        chosenByForm.set(guideline.form, guideline.id);
      }
    }

    const grouped = new Map<string, Guideline[]>();
    for (const guideline of list) {
      const group = grouped.get(guideline.form) ?? [];
      group.push(guideline);
      grouped.set(guideline.form, group);
    }

    for (const [form, group] of grouped.entries()) {
      const active = group.filter(g => g.isActive);
      if (active.length === 1) {
        chosenByForm.set(form, active[0].id);
        continue;
      }

      const sortedByDate = [...group].sort((a, b) => this.parseDisplayDate(b.lastUpdated) - this.parseDisplayDate(a.lastUpdated));
      chosenByForm.set(form, sortedByDate[0].id);
    }

    return list.map(guideline => ({
      ...guideline,
      isActive: chosenByForm.get(guideline.form) === guideline.id,
    }));
  }
}

