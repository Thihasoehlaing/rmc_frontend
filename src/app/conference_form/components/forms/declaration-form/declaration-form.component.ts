import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-declaration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './declaration-form.component.html',
  styleUrl: './declaration-form.component.scss'
})
export class DeclarationFormComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    this.form = this.fb.group({
      confirmPresenter: [false, [Validators.requiredTrue]],
      confirmScopusIndexed: [false, [Validators.requiredTrue]],
      confirmNotResignedStaff: [false, [Validators.requiredTrue]],
      confirmJointAuthorship: [false],
      confirmCompliance: [false, [Validators.requiredTrue]],
      confirmPostReturn: [false, [Validators.requiredTrue]],
      agreeToTerms: [false, [Validators.requiredTrue]],
      acknowledgeGrantFunder: [false, [Validators.requiredTrue]]
    });
  }
}
