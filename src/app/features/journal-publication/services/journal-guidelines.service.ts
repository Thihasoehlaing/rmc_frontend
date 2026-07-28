import { Injectable, signal } from '@angular/core';

export interface JournalGuideline {
  id: string;
  title: string;
  formName: string;
  sectionName: string;
  content: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class JournalGuidelinesService {
  private storageKey = 'rmc_journal_guidelines';
  private versionKey = 'rmc_journal_guidelines_version';
  private currentVersion = '1.0';

  private defaultGuidelines: JournalGuideline[] = [
    {
      id: 'default-1',
      title: 'Publication Claim Guidelines',
      formName: 'Journal Publication Form',
      sectionName: 'General',
      content: '1. All claims must be accompanied by the published paper.\\n2. Claims must be submitted within 6 months of publication.\\n3. Scopus Q1/Q2 receive RM 1,000.00, Q3/Q4 receive RM 500.00.',
      status: 'Active',
      createdDate: new Date().toISOString()
    }
  ];

  guidelines = signal<JournalGuideline[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const storedVersion = localStorage.getItem(this.versionKey);
    if (storedVersion !== this.currentVersion) {
      this.loadDefaults();
      localStorage.setItem(this.versionKey, this.currentVersion);
      this.saveToStorage();
      return;
    }

    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.guidelines.set(JSON.parse(stored));
      } catch (e) {
        this.loadDefaults();
      }
    } else {
      this.loadDefaults();
    }
  }

  private loadDefaults(): void {
    this.guidelines.set([...this.defaultGuidelines]);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.guidelines()));
  }

  getAll(): JournalGuideline[] {
    return this.guidelines();
  }

  getActiveBySection(formName: string, sectionName: string): JournalGuideline[] {
    return this.guidelines().filter(g => g.status === 'Active' && g.formName === formName && g.sectionName === sectionName);
  }

  addGuideline(guideline: JournalGuideline): void {
    this.guidelines.update(list => [...list, guideline]);
    this.saveToStorage();
  }

  updateGuideline(id: string, updated: JournalGuideline): void {
    this.guidelines.update(list => list.map(g => g.id === id ? updated : g));
    this.saveToStorage();
  }

  deleteGuideline(id: string): void {
    this.guidelines.update(list => list.filter(g => g.id !== id));
    this.saveToStorage();
  }
}
