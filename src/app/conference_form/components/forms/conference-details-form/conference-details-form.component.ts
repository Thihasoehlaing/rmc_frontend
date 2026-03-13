import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NoteComponent } from '../../../../shared/components/note/note.component';

@Component({
  selector: 'app-conference-details-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NoteComponent],
  templateUrl: './conference-details-form.component.html',
  styleUrl: './conference-details-form.component.scss'
})
export class ConferenceDetailsFormComponent implements OnInit {
  form!: FormGroup;

  regions = [
    'Americas',
    'ASEAN',
    'Australia',
    'Europe',
    'Malaysia',
    'MEA (Middle East & Africa)',
    'Pacific Islands'
  ];

  restrictedPublishers = [
    'MDPI',
    'Common Ground',
    'Hindawi',
    'Frontiers',
    'Other'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    this.form = this.fb.group({
      fundingRequestType: ['', [Validators.required]],
      conferenceType: ['', [Validators.required]],
      travelRequired: ['', [Validators.required]],
      authorshipType: ['', [Validators.required]],
      scopusPublicationGuaranteed: ['', [Validators.required]],
      restrictedPublisher: ['', [Validators.required]],
      sdgKeyword1: ['', [Validators.required]],
      sdgKeyword2: ['', [Validators.required]],
      sdgKeyword3: ['', [Validators.required]],
      conferenceName: ['', [Validators.required, Validators.maxLength(200)]],
      conferenceStartDate: ['', [Validators.required]],
      conferenceEndDate: ['', [Validators.required]],
      localOrOverseas: ['', [Validators.required]],
      researchType: ['', [Validators.required]],
      conferenceLocation: ['', [Validators.required, Validators.maxLength(200)]],
      paperTitle: ['', [Validators.required, Validators.maxLength(200)]],
      selectedRegion: ['', [Validators.required]],
      regionName: [''],
      percentage: [''],
      limit: [''],
      regionDescription: [''],
      projectAccountCode: [''],
      totalRM: [''],
      sponsoredAmountExternal: [''],
      sponsoredBy: [''],
      sponsorshipPercentage: [''],
      sponsorshipAmountAPU: [''],
      costByApplicant: [''],
      costingRemarks: [''],
      externalProjectAccountCode: [''],
      externalTotalRM: [''],
      externalSponsoredAmountExternal: [''],
      externalSponsoredBy: [''],
      externalSponsorshipPercentage: [''],
      externalSponsorshipAmountAPU: [''],
      externalCostByApplicant: [''],
      externalCostingRemarks: [''],
      localProjectAccountCode: [''],
      localTotalRM: [''],
      localSponsoredAmountExternal: [''],
      localSponsoredBy: [''],
      localSponsorshipPercentage: [''],
      localSponsorshipAmountAPU: [''],
      localCostByApplicant: [''],
      localCostingRemarks: [''],
      overseasProjectAccountCode: [''],
      overseasTotalRM: [''],
      overseasSponsoredAmountExternal: [''],
      overseasSponsoredBy: [''],
      overseasSponsorshipPercentage: [''],
      overseasSponsorshipAmountAPU: [''],
      overseasCostByApplicant: [''],
      overseasCostingRemarks: ['']
    });
  }

  getCharacterCount(fieldName: string): number {
    const value = this.form.get(fieldName)?.value || '';
    return value.length;
  }

  get selectedRegion(): string {
    return this.form.get('selectedRegion')?.value || '';
  }

  get selectedLocalOrOverseas(): string {
    return this.form.get('localOrOverseas')?.value || '';
  }

  get researchType(): string {
    return this.form.get('researchType')?.value || '';
  }
}

