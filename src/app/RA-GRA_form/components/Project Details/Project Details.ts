import { Component, OnInit, OnDestroy, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { NoteComponent } from '../../../shared/components/note/note.component';

@Component({
  selector: 'app-ragra-project-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ValidationMessageComponent, CustomSubheaderComponent, NoteComponent],
  templateUrl: './Project Details.html',
  styleUrls: ['./Project Details.scss']
})
export class ProjectDetailsComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  @Output() formValidityChange = new EventEmitter<boolean>();

  // ── Dropdown / option data ───────────────────────────────────

  readonly accountCodeOptions = [
    { value: 'AC001', label: 'AC001' },
    { value: 'AC002', label: 'AC002' },
    { value: 'AC003', label: 'AC003' },
    { value: 'AC004', label: 'AC004' },
  ];

  readonly voteOptions = [
    { value: 'V11000', label: 'V11000 (Student Allowance)' },
    { value: 'V12000', label: 'V12000 (Research Equipment)' },
    { value: 'V13000', label: 'V13000 (Research Materials)' },
    { value: 'V14000', label: 'V14000 (Travel & Conference)' },
  ];

  readonly clusterOptions = [
    { value: 'RC001', label: 'Advanced Computing & AI Research Cluster' },
    { value: 'RC002', label: 'Sustainable Engineering Research Cluster' },
    { value: 'RC003', label: 'Business Innovation Research Cluster' },
    { value: 'RC004', label: 'Digital Media & Design Research Cluster' },
    { value: 'RC005', label: 'Health & Biomedical Research Cluster' },
  ];

  readonly activeRaGraOptions = ['1', '2', '3'];

  // ── Derived state getters ────────────────────────────────────

  /** True when Research Assistant (UG) is selected. */
  get isRA(): boolean {
    return this.form?.get('positionRequested')?.value === 'RA';
  }

  /** True when placement is Research Project. */
  get isResearchProject(): boolean {
    return this.form?.get('placement')?.value === 'Research Project';
  }

  /** True when placement is Research Cluster. */
  get isResearchCluster(): boolean {
    return this.form?.get('placement')?.value === 'Research Cluster';
  }

  /** True when Category of Grant is Internal. */
  get isInternalGrant(): boolean {
    return this.form?.get('projectDetails.categoryOfGrant')?.value === 'Internal';
  }

  // ── Lifecycle ────────────────────────────────────────────────

  ngOnInit(): void {
    this.form = this.fb.group({
      // Applicant Details
      schoolName: ['', Validators.required],

      // Project / Research Cluster Details
      positionRequested: ['', Validators.required],
      applicationType:   ['', Validators.required],
      placement:         ['', Validators.required],
      year:              ['', Validators.required],

      // Research Project Details sub-group
      // Validators are added/removed dynamically based on placement selection.
      projectDetails: this.fb.group({
        accountCode:      [''],
        selectVote:       [''],
        categoryOfGrant:  [''],
        researchTitle:    [''],
        projectStartDate: [''],
        projectEndDate:   [''],
        funder:           ['Asia Pacific University'],
      }),

      // Research Cluster Details sub-group
      // Validators are added/removed dynamically based on placement selection.
      clusterDetails: this.fb.group({
        selectedCluster:  [''],
        activeRaGraCount: [''],
      }),
    });

    // ── Req 4: RA forces placement to Research Project ───────
    this.form.get('positionRequested')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((position: string) => {
        if (position === 'RA') {
          this.form.get('placement')!.setValue('Research Project');
        }
      });

    // ── Req 1/2: Swap validators when placement changes ──────
    this.form.get('placement')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((placement: string) => {
        this.applyPlacementValidators(placement);
      });

    // ── Req 3: Internal Grant → lock funder field ────────────
    this.form.get('projectDetails.categoryOfGrant')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((category: string) => {
        const funderCtrl = this.form.get('projectDetails.funder')!;
        if (category === 'Internal') {
          funderCtrl.setValue('Asia Pacific University');
          funderCtrl.disable();
        } else {
          funderCtrl.enable();
        }
      });

    // ── Emit validity on every change ────────────────────────
    this.form.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.formValidityChange.emit(this.form.valid));

    // Emit initial validity
    this.formValidityChange.emit(this.form.valid);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Private helpers ──────────────────────────────────────────

  /**
   * Adds Validators.required to the active placement sub-group and
   * clears validators from the inactive one so it never blocks submission.
   */
  private applyPlacementValidators(placement: string): void {
    const pd = this.form.get('projectDetails') as FormGroup;
    const cd = this.form.get('clusterDetails') as FormGroup;

    if (placement === 'Research Project') {
      // Activate project validators
      this.setGroupValidators(pd, {
        accountCode:      [Validators.required],
        selectVote:       [Validators.required],
        categoryOfGrant:  [Validators.required],
        researchTitle:    [Validators.required],
        projectStartDate: [Validators.required],
        projectEndDate:   [Validators.required],
        funder:           [Validators.required],
      });
      // Clear cluster validators
      this.clearGroupValidators(cd, ['selectedCluster', 'activeRaGraCount']);

    } else if (placement === 'Research Cluster') {
      // Activate cluster validators
      this.setGroupValidators(cd, {
        selectedCluster:  [Validators.required],
        activeRaGraCount: [Validators.required],
      });
      // Clear project validators
      this.clearGroupValidators(pd, [
        'accountCode', 'selectVote', 'categoryOfGrant',
        'researchTitle', 'projectStartDate', 'projectEndDate', 'funder',
      ]);

    } else {
      // No placement selected — clear both
      this.clearGroupValidators(pd, [
        'accountCode', 'selectVote', 'categoryOfGrant',
        'researchTitle', 'projectStartDate', 'projectEndDate', 'funder',
      ]);
      this.clearGroupValidators(cd, ['selectedCluster', 'activeRaGraCount']);
    }
  }

  private setGroupValidators(
    group: FormGroup,
    config: Record<string, Parameters<typeof Validators.compose>[0]>
  ): void {
    Object.entries(config).forEach(([key, validators]) => {
      const ctrl = group.get(key);
      if (ctrl) {
        ctrl.setValidators(validators as any);
        ctrl.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  private clearGroupValidators(group: FormGroup, keys: string[]): void {
    keys.forEach(key => {
      const ctrl = group.get(key);
      if (ctrl) {
        ctrl.clearValidators();
        ctrl.updateValueAndValidity({ emitEvent: false });
      }
    });
  }
}
