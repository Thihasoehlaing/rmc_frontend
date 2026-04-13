import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';

@Component({
  selector: 'app-risk-assessment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomSubheaderComponent,
    CharacterCounterComponent
  ],
  templateUrl: './risk-assessment.html',
  styleUrls: ['./risk-assessment.scss']
})
export class RiskAssessment {
  private fb = inject(FormBuilder);

  riskForm: FormGroup = this.fb.group({
    affordability: ['', [Validators.required, Validators.maxLength(2000)]],
    sustainability: ['', [Validators.required, Validators.maxLength(2000)]],
    strategic: ['', [Validators.required, Validators.maxLength(2000)]],
    studentFocus: ['', [Validators.required, Validators.maxLength(2000)]],
    outcome: ['', [Validators.required, Validators.maxLength(500)]],
    measurableOutcomes: ['', [Validators.required, Validators.maxLength(2000)]]
  });
}
