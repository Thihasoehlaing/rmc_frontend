import { Component, OnInit, Output, EventEmitter, inject, effect } from '@angular/core';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JournalWorkflowService } from '../../services/journal-workflow.service';

@Component({
  selector: 'app-declaration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomHeaderComponent, CustomSubheaderComponent],
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
}