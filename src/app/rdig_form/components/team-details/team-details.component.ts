import { Component, Input, OnInit, OnDestroy, inject, signal, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';
import { RdigDropdownOptionsService } from '../../../settings/rdig-dropdown-options.service';
import { AuthService } from '../../../services/auth.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';

interface RestCountry {
  name?: {
    common?: string;
    official?: string;
  };
  cca2?: string;
}

@Component({
  selector: 'app-team-details',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    CharacterCounterComponent,
    ValidationMessageComponent,
    CustomHeaderComponent,
    CustomSubheaderComponent,
    FileUploadComponent,
    DialogComponent,
    ReviewBlockComponent,
    DataTableComponent,
    ActionButtonComponent,
  ],
  templateUrl: './team-details.component.html',
  styleUrl: './team-details.component.scss'
})
export class TeamDetailsComponent implements OnInit, OnDestroy {
  private readonly dropdownService = inject(RdigDropdownOptionsService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  /** Eligible internal co-researchers: (full_time|contract) AND academic, NOT Reviewer/blocked */
  readonly eligibleResearchers = this.authService.getEligibleCoResearchers();
  readonly researcherOptions: { label: string; value: string }[] =
    this.eligibleResearchers.map(r => ({ label: r.name, value: r.id }));
  @Input({ required: true }) parentForm!: FormGroup;
  @Input() showHosComments = false;
  @Input() showRmcComments = false;
  @Input() showR1Comments = false;
  @Input() showR2Comments = false;
  @Input() showRdigChairComments = false;
  @Input() showVcComments = false;
  @Input() showCeoComments = false;

  get showAnyComments(): boolean {
    return this.showHosComments || this.showRmcComments ||
      this.showR1Comments || this.showR2Comments ||
      this.showRdigChairComments || this.showVcComments || this.showCeoComments;
  }
  @Input() workflow!: RdigWorkflowService;

  get teamDetails() { return this.parentForm.get('teamDetails') as FormGroup; }
  get internalResearchers() { return this.teamDetails.get('internalResearchers') as FormArray; }
  get externalResearchers() { return this.teamDetails.get('externalResearchers') as FormArray; }

  get reviewTeam() { return this.parentForm.get('reviewTeam') as FormGroup; }
  fc(name: string): FormControl { return this.reviewTeam.get(name) as FormControl; }

  readonly internalColumns: DataTableColumn[] = [
    { key: 'index', label: '#', width: '52px', align: 'center', headerAlign: 'center' },
    { key: 'staff', label: 'Staff Name / Department', width: '32%' },
    { key: 'expertise', label: 'Area of Expertise', width: '26%' },
    { key: 'roles', label: 'Role in Project', width: '26%' },
    { key: 'actions', label: 'Actions', width: '96px', align: 'center', headerAlign: 'center' }
  ];

  readonly externalColumns: DataTableColumn[] = [
    { key: 'index', label: '#', width: '52px', align: 'center', headerAlign: 'center' },
    { key: 'collaborator', label: 'Collaborator', width: '32%' },
    { key: 'institution', label: 'Institution', width: '24%' },
    { key: 'country', label: 'Country', width: '14%', align: 'center', headerAlign: 'center' },
    { key: 'funding', label: 'Matched Funding', width: '16%', align: 'right', headerAlign: 'right' },
    { key: 'actions', label: 'Actions', width: '96px', align: 'center', headerAlign: 'center' }
  ];

  readonly trackByIndex = (index: number) => index;

  showInternalModal = signal(false);
  showExternalModal = signal(false);
  editingInternalIdx = signal<number | null>(null);
  editingExternalIdx = signal<number | null>(null);

  internalForm: FormGroup;
  externalForm: FormGroup;

  clusters: { label: string; value: string }[] = [];
  orgTypes: { label: string; value: string }[] = [];
  countryOptions: { label: string; value: string }[] = [];
  countriesLoading = false;

  titles = [
    { label: 'Prof.', value: 'Prof.' },
    { label: 'Assoc. Prof.', value: 'Assoc. Prof.' },
    { label: 'Dr.', value: 'Dr.' },
    { label: 'Mr.', value: 'Mr.' },
    { label: 'Ms.', value: 'Ms.' },
    { label: 'Ts.', value: 'Ts.' },
    { label: 'Ir.', value: 'Ir.' },
    { label: 'Dato\'', value: 'Dato\'' }
  ];

  constructor(private fb: FormBuilder) {
    this.internalForm = this.fb.group({
      staffId: ['', Validators.required],
      staffName: [''],
      department: [''],
      expertise: ['', [Validators.required, Validators.maxLength(200)]],
      roles: ['', [Validators.required, Validators.maxLength(600)]]
    });

    this.externalForm = this.fb.group({
      title: ['', Validators.required],
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      institution: ['', Validators.required],
      orgType: ['', Validators.required],
      position: ['', Validators.required],
      department: ['', Validators.required],
      country: ['', Validators.required],
      funding: ['', [Validators.required, Validators.pattern('^[0-9]+(\\.[0-9]{1,2})?$')]],
      roles: ['', [Validators.required, Validators.maxLength(600)]],
      supportLetter: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.dropdownService.loadOptions('research_cluster').subscribe();
    this.dropdownService.getOptions('research_cluster')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => {
        this.clusters = options
          .filter(o => o.status === 'Active')
          .map(o => ({ label: o.optionName, value: o.id.toString() }));
      });

    this.dropdownService.loadOptions('type_of_organisation').subscribe();
    this.dropdownService.getOptions('type_of_organisation')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => {
        this.orgTypes = options
          .filter(o => o.status === 'Active')
          .map(o => ({ label: o.optionName, value: o.optionName.toLowerCase().replace(/\s+/g, '-') }));
      });

    // Auto-populate name + department when a researcher is selected from the dropdown
    this.internalForm.get('staffId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => this.onResearcherSelected(id));

    this.loadCountryOptions();

    // Listen for dropdown updates from admin settings
    const onDropdownsUpdated = (): void => {
      this.dropdownService.loadOptions('type_of_organisation').subscribe();
      this.dropdownService.getOptions('type_of_organisation')
        .pipe(takeUntil(this.destroy$))
        .subscribe(options => {
          this.orgTypes = options
            .filter(o => o.status === 'Active')
            .map(o => ({ label: o.optionName, value: o.optionName.toLowerCase().replace(/\s+/g, '-') }));
          this.cdr.detectChanges();
        });
    };

    window.addEventListener('rmc-dropdowns-updated', onDropdownsUpdated);
    this.destroy$.subscribe(() => {
      window.removeEventListener('rmc-dropdowns-updated', onDropdownsUpdated);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getInitials(value: string): string {
    if (!value) return '--';
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  /** Called when the user picks a researcher from the dropdown. */
  onResearcherSelected(userId: string): void {
    const researcher = this.eligibleResearchers.find(r => r.id === userId);
    if (researcher) {
      this.internalForm.patchValue({
        staffName: researcher.name,
        department: researcher.department,
      });
    } else {
      this.internalForm.patchValue({ staffName: '', department: '' });
    }
  }

  private loadCountryOptions(): void {
    this.countriesLoading = true;
    this.http.get<RestCountry[]>('https://restcountries.com/v3.1/all?fields=name,cca2')
      .pipe(
        map(countries => this.normalizeCountryOptions(countries)),
        catchError(error => {
          console.error('Failed to load country options from REST Countries API', error);
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(options => {
        this.countryOptions = options;
        this.countriesLoading = false;
      });
  }

  private normalizeCountryOptions(countries: RestCountry[]): { label: string; value: string }[] {
    const optionsByName = new Map<string, { label: string; value: string }>();

    countries.forEach(country => {
      const rawName = country.name?.common?.trim();
      if (!rawName) return;

      const name = rawName.toLowerCase() === 'israel' ? 'Palestine' : rawName;
      const key = name.toLowerCase();

      if (!optionsByName.has(key)) {
        optionsByName.set(key, { label: name, value: name });
      }
    });

    return Array.from(optionsByName.values())
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  openInternalModal(): void {
    if (this.internalResearchers.length >= 2) return;
    this.editingInternalIdx.set(null);
    this.internalForm.reset({ staffId: '', staffName: '', department: '' });
    this.showInternalModal.set(true);
  }

  openEditInternalModal(index: number): void {
    const row = this.internalResearchers.at(index).getRawValue();
    this.editingInternalIdx.set(index);
    this.internalForm.patchValue(row);
    this.showInternalModal.set(true);
  }

  saveInternal(): void {
    if (this.internalForm.invalid) {
      this.internalForm.markAllAsTouched();
      return;
    }
    const idx = this.editingInternalIdx();
    const data = this.internalForm.getRawValue();
    if (idx !== null) {
      this.internalResearchers.at(idx).patchValue(data);
    } else {
      this.internalResearchers.push(this.fb.group(data));
    }
    this.showInternalModal.set(false);
    this.editingInternalIdx.set(null);
  }

  removeInternal(index: number): void {
    this.internalResearchers.removeAt(index);
  }

  openExternalModal(): void {
    if (this.externalResearchers.length >= 10) return;
    this.editingExternalIdx.set(null);
    this.externalForm.reset();
    this.showExternalModal.set(true);
  }

  openEditExternalModal(index: number): void {
    const row = this.externalResearchers.at(index).getRawValue();
    this.editingExternalIdx.set(index);
    this.externalForm.patchValue(row);
    this.externalForm.get('supportLetter')?.clearValidators();
    this.externalForm.get('supportLetter')?.updateValueAndValidity();
    this.showExternalModal.set(true);
  }

  saveExternal(): void {
    if (this.externalForm.invalid) {
      this.externalForm.markAllAsTouched();
      return;
    }
    const idx = this.editingExternalIdx();
    const data = this.externalForm.getRawValue();
    if (idx !== null) {
      this.externalResearchers.at(idx).patchValue(data);
    } else {
      this.externalResearchers.push(this.fb.group(data));
    }
    this.showExternalModal.set(false);
    this.editingExternalIdx.set(null);
  }

  removeExternal(index: number): void {
    this.externalResearchers.removeAt(index);
  }

  onFileSelected(file: File): void {
    this.externalForm.get('supportLetter')?.setValue(file);
  }

  manageOrgTypes(): void {
    this.router.navigate(['/settings/rdig-dropdown-options']);
  }
}
