import { Component, OnInit, Output, EventEmitter, inject, effect } from '@angular/core';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JournalWorkflowService } from '../../services/journal-workflow.service';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { JournalFormData, JournalRequestPayload } from '../../services/journal-application-api.service';

@Component({
  selector: 'app-declaration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomHeaderComponent, ValidationMessageComponent],
  templateUrl: './declaration.html',
  styleUrl: './declaration.scss'
})
export class DeclarationComponent implements OnInit {
  declarationForm!: FormGroup;

  @Output() formValidityChange = new EventEmitter<boolean>();

  workflow = inject(JournalWorkflowService);

  constructor(private fb: FormBuilder) {
    effect(() => {
      setTimeout(() => {
        if (this.workflow.isFormReadOnly()) {
          this.declarationForm?.disable({ emitEvent: false });
        } else {
          this.declarationForm?.enable({ emitEvent: false });
        }
      }, 0);
    });
  }

  ngOnInit() {
    this.initializeDeclarationForm();
  }

  initializeDeclarationForm() {
    this.declarationForm = this.fb.group({
      confirmPresenter: [false, [Validators.requiredTrue]],
      confirmScopusIndexed: [false, [Validators.requiredTrue]],
      confirmNotResignedStaff: [false, [Validators.requiredTrue]],
      confirmJointAuthorship: [false],
      confirmCompliance: [false, [Validators.requiredTrue]],
      confirmPostReturn: [false, [Validators.requiredTrue]],
      agreeToTerms: [false, [Validators.requiredTrue]],
      acknowledgeGrantFunder: [false, [Validators.requiredTrue]]
    });

    // Emit validity changes whenever the form value changes
    this.declarationForm.valueChanges.subscribe(() => {
      this.formValidityChange.emit(this.declarationForm.valid);
    });

    // Emit initial validity
    this.formValidityChange.emit(this.declarationForm.valid);
  }

  getJournalPayload(): JournalRequestPayload {
    const value = this.declarationForm.getRawValue();
    return {
      declaration_terms_accepted: !!value.agreeToTerms,
      declaration_funder_acknowledged: !!value.acknowledgeGrantFunder,
    };
  }

  hydrateFromApi(data: JournalFormData): void {
    const journal = data.journal;
    if (!journal || !this.declarationForm) {
      return;
    }

    this.declarationForm.patchValue(
      {
        agreeToTerms: !!journal.declaration_terms_accepted,
        acknowledgeGrantFunder: !!journal.declaration_funder_acknowledged,
      },
      { emitEvent: false },
    );
  }
}
