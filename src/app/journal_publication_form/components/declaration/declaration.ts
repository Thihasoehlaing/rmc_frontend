import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-declaration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './declaration.html',
  styleUrl: './declaration.scss'
})
export class DeclarationComponent implements OnInit {
  declarationForm!: FormGroup;

  @Output() formValidityChange = new EventEmitter<boolean>();

  constructor(private fb: FormBuilder) {}

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