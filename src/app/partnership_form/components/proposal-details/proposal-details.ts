import { Component, inject, Input, SimpleChanges, OnChanges, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../interfaces/components.interface';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { PartnershipOptionsService } from '../../services/partnership-options.service';

@Component({
  selector: 'app-proposal-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomSubheaderComponent,
    SearchableDropdownComponent,
    CharacterCounterComponent
  ],
  templateUrl: './proposal-details.html',
  styleUrls: ['./proposal-details.scss']
})
export class ProposalDetails implements OnChanges, OnInit {
  private fb = inject(FormBuilder);
  private partnershipOptionsService = inject(PartnershipOptionsService);

  @Input() isDisabled = false;

  partnershipOptions: DropdownOption<string>[] = [
    { label: 'Academic', value: 'Academic' },
    { label: 'Industry', value: 'Industry' },
    { label: 'Both', value: 'Both' }
  ];

  categoryOptions: DropdownOption<string>[] = [];

  applicantForm: FormGroup = this.fb.group({
    applicantName: [{ value: 'John Doe', disabled: true }],
    functionalArea: [{ value: 'School of Computing', disabled: true }],
    applicantEmail: [{ value: 'john.doe@apu.edu.my', disabled: true }],
    mobileNumber: [{ value: '+60123456789', disabled: true }],
    partnershipType: ['', Validators.required],
    proposedPartnerName: ['', [Validators.required, Validators.maxLength(500)]],
    rationale: ['', [Validators.required, Validators.maxLength(4000)]],
    benefits: ['', [Validators.required, Validators.maxLength(4000)]],
    timescale: ['', [Validators.required, Validators.maxLength(2000)]],
    managementArrangement: ['', [Validators.required, Validators.maxLength(2000)]],
    constraints: ['', [Validators.required, Validators.maxLength(2000)]],
    impactOnStaff: ['', [Validators.required, Validators.maxLength(2000)]],
    impactOnOtherUnits: ['', [Validators.required, Validators.maxLength(2000)]],
    resourceImplications: ['', [Validators.required, Validators.maxLength(2000)]],
    otherSchoolsInvolved: ['', [Validators.required, Validators.maxLength(2000)]],
    contactMade: ['', [Validators.required, Validators.maxLength(2000)]],
    partnershipCategory: ['', Validators.required],
    schoolDiscussions: ['', [Validators.required, Validators.maxLength(2000)]],
    programmesIdentified: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  constructor() {
    effect(() => {
      const allActiveCategories = this.partnershipOptionsService
        .categoryOptions()
        .filter(opt => opt.status === 'Active' || !opt.status);
      this.categoryOptions = [...allActiveCategories];
    });
  }

  ngOnInit(): void {
    this.updateFormState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isDisabled'] && !changes['isDisabled'].firstChange) {
      this.updateFormState();
    }
  }

  private updateFormState(): void {
    const readOnlyFields = ['applicantName', 'functionalArea', 'applicantEmail', 'mobileNumber'];

    if (this.isDisabled) {
      this.applicantForm.disable({ emitEvent: false });
    } else {
      this.applicantForm.enable({ emitEvent: false });
      // Re-disable explicitly read-only base fields
      readOnlyFields.forEach(field => this.applicantForm.get(field)?.disable({ emitEvent: false }));
    }
  }
}
