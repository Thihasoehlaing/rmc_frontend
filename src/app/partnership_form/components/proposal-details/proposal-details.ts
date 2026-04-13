import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown.component';
import { DropdownOption } from '../../../interfaces/components.interface';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';

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
export class ProposalDetails {
  private fb = inject(FormBuilder);

  partnershipOptions: DropdownOption<string>[] = [
    { label: 'Academic', value: 'Academic' },
    { label: 'Industry', value: 'Industry' },
    { label: 'Both', value: 'Both' }
  ];

  categoryOptions: DropdownOption<string>[] = [
    { label: 'Category 1', value: 'Category 1' },
    { label: 'Category 2', value: 'Category 2' },
    { label: 'Category 3', value: 'Category 3' }
  ];

  applicantForm: FormGroup = this.fb.group({
    applicantName: [{ value: 'John Doe', disabled: true }],
    functionalArea: [{ value: 'School of Computing', disabled: true }],
    applicantEmail: [{ value: 'john.doe@apu.edu.my', disabled: true }],
    mobileNumber: [{ value: '+60123456789', disabled: true }],
    partnershipType: ['', Validators.required],
    proposedPartnerName: ['', Validators.required],
    rationale: ['', [Validators.required, Validators.maxLength(1500)]],
    benefits: ['', [Validators.required, Validators.maxLength(1500)]],
    timescale: ['', [Validators.required, Validators.maxLength(1000)]],
    managementArrangement: ['', [Validators.required, Validators.maxLength(1000)]],
    constraints: ['', [Validators.required, Validators.maxLength(1000)]],
    impactOnStaff: ['', [Validators.required, Validators.maxLength(1000)]],
    impactOnOtherUnits: ['', [Validators.required, Validators.maxLength(1000)]],
    resourceImplications: ['', [Validators.required, Validators.maxLength(1000)]],
    otherSchoolsInvolved: ['', [Validators.required, Validators.maxLength(1000)]],
    contactMade: ['', [Validators.required, Validators.maxLength(1000)]],
    partnershipCategory: ['', Validators.required],
    schoolDiscussions: ['', [Validators.required, Validators.maxLength(1000)]],
    programmesIdentified: ['', [Validators.required, Validators.maxLength(1000)]]
  });
}
