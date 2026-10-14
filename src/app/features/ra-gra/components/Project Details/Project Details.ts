import { Component, OnInit, inject, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { SearchableDropdownComponent } from '../../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../../core/interfaces/components.interface';

@Component({
  selector: 'app-ragra-project-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ValidationMessageComponent, NoteComponent, SearchableDropdownComponent],
  templateUrl: './Project Details.html',
  styleUrls: ['./Project Details.scss']
})
export class ProjectDetailsComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  
  form!: FormGroup;
  @Output() formValidityChange = new EventEmitter<boolean>();

  // Dropdown options (DropdownOption<string> format for searchable-dropdown)
  accountCodeOptions: DropdownOption<string>[] = [
    { label: 'ACC001 - Research Fund A', value: 'ACC001' },
    { label: 'ACC002 - Research Fund B', value: 'ACC002' },
    { label: 'ACC003 - Research Fund C', value: 'ACC003' }
  ];

  voteOptions: DropdownOption<string>[] = [
    { label: 'V11000 (Student Allowance)', value: 'V11000' },
    { label: 'V12000 (Equipment)', value: 'V12000' },
    { label: 'V13000 (Travel)', value: 'V13000' }
  ];

  researchClusterOptions: DropdownOption<string>[] = [
    { label: 'Artificial Intelligence Research Cluster', value: 'AI' },
    { label: 'Cybersecurity Research Centre', value: 'Cybersecurity' },
    { label: 'Data Science Research Cluster', value: 'DataScience' },
    { label: 'IoT and Smart Systems Research Centre', value: 'IoT' },
    { label: 'Sustainable Technology Research Cluster', value: 'Sustainable' }
  ];

  ngOnInit() {
    this.form = this.fb.group({
      schoolName: ['', Validators.required],
      positionRequested: ['', Validators.required],
      applicationType: ['', Validators.required],
      placement: ['', Validators.required],
      
      // Research Project Details fields
      accountCode: [''],
      selectVote: [''],
      categoryOfGrant: [''],
      researchTitle: [''],
      projectStartDate: [''],
      projectEndDate: [''],
      researchGrantFunder: ['Asia Pacific University'],
      
      // Research Cluster Details fields
      researchCluster: [''],
      activeRaGraCount: ['']
    });

    // Listen to positionRequested changes
    this.form.get('positionRequested')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(position => {
        this.handlePositionChange(position);
      });

    // Listen to placement changes
    this.form.get('placement')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(placement => {
        this.handlePlacementChange(placement);
      });

    // Listen to categoryOfGrant changes
    this.form.get('categoryOfGrant')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(category => {
        this.handleCategoryOfGrantChange(category);
      });

    this.form.statusChanges.subscribe(status => {
      this.formValidityChange.emit(status === 'VALID');
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle Position Requested changes
   * If RA (UG Student) is selected, disable Research Cluster and auto-select Research Project
   */
  private handlePositionChange(position: string) {
    if (position === 'RA') {
      // Auto-select Research Project for UG students
      this.form.patchValue({ placement: 'Research Project' }, { emitEvent: true });
    }
  }

  /**
   * Handle Placement changes
   * Show/hide Research Project Details or Research Cluster Details section and apply validators
   */
  private handlePlacementChange(placement: string) {
    const projectFields = [
      'accountCode',
      'selectVote',
      'categoryOfGrant',
      'researchTitle',
      'projectStartDate',
      'projectEndDate',
      'researchGrantFunder'
    ];

    const clusterFields = [
      'researchCluster',
      'activeRaGraCount'
    ];

    if (placement === 'Research Project') {
      // Add required validators to project fields
      projectFields.forEach(field => {
        const control = this.form.get(field);
        control?.setValidators([Validators.required]);
        control?.updateValueAndValidity({ emitEvent: false });
      });
      
      // Remove validators from cluster fields and clear values
      clusterFields.forEach(field => {
        const control = this.form.get(field);
        control?.clearValidators();
        control?.setValue('');
        control?.updateValueAndValidity({ emitEvent: false });
      });
      
    } else if (placement === 'Research Cluster') {
      // Add required validators to cluster fields
      clusterFields.forEach(field => {
        const control = this.form.get(field);
        control?.setValidators([Validators.required]);
        control?.updateValueAndValidity({ emitEvent: false });
      });
      
      // Remove validators from project fields and clear values
      projectFields.forEach(field => {
        const control = this.form.get(field);
        control?.clearValidators();
        control?.setValue('');
        control?.updateValueAndValidity({ emitEvent: false });
      });
      // Reset funder to default
      this.form.get('researchGrantFunder')?.setValue('Asia Pacific University');
      this.form.get('researchGrantFunder')?.enable({ emitEvent: false });
      
    } else {
      // No placement selected - remove all validators
      [...projectFields, ...clusterFields].forEach(field => {
        const control = this.form.get(field);
        control?.clearValidators();
        control?.setValue('');
        control?.updateValueAndValidity({ emitEvent: false });
      });
      // Reset funder to default
      this.form.get('researchGrantFunder')?.setValue('Asia Pacific University');
      this.form.get('researchGrantFunder')?.enable({ emitEvent: false });
    }
  }

  /**
   * Handle Category of Grant changes
   * Lock/unlock Research Grant/Project Funder field
   */
  private handleCategoryOfGrantChange(category: string) {
    const funderControl = this.form.get('researchGrantFunder');
    
    if (category === 'Internal Grant') {
      // Lock to Asia Pacific University
      funderControl?.setValue('Asia Pacific University');
      funderControl?.disable({ emitEvent: false });
    } else if (category === 'External Grant') {
      // Make editable - user can change the value
      funderControl?.enable({ emitEvent: false });
    }
  }

  /**
   * Check if Research Cluster option should be disabled
   */
  get isResearchClusterDisabled(): boolean {
    return this.form.get('positionRequested')?.value === 'RA';
  }

  /**
   * Check if Research Project Details section should be shown
   */
  get showResearchProjectDetails(): boolean {
    return this.form.get('placement')?.value === 'Research Project';
  }

  /**
   * Check if Research Cluster Details section should be shown
   */
  get showResearchClusterDetails(): boolean {
    return this.form.get('placement')?.value === 'Research Cluster';
  }
}
