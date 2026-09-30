import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';

@Component({
  selector: 'app-ragra-declaration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ValidationMessageComponent
  ],
  templateUrl: './Declaration.html',
  styleUrls: ['./Declaration.scss']
})
export class DeclarationComponent implements OnInit {
  private fb = inject(FormBuilder);

  /** Emits the form's validity state whenever it changes. */
  @Output() formValidityChange = new EventEmitter<boolean>();

  /** Exposed publicly so the shell can call declarationForm.markAllAsTouched() via @ViewChild. */
  declarationForm!: FormGroup;

  /** Controls whether the family member details textarea is shown. */
  get hasFamilyMember(): boolean {
    return this.declarationForm?.get('hasFamilyMember')?.value === true;
  }

  ngOnInit(): void {
    this.declarationForm = this.fb.group({
      // Section 1 — family member disclosure (optional checkbox, details required if checked)
      hasFamilyMember:        [false],
      familyMemberDetails:    [''],

      // Section 2 — main agreement (required)
      agreeToDeclaration:     [false, [Validators.requiredTrue]]
    });

    // When hasFamilyMember is unchecked, clear the details field
    this.declarationForm.get('hasFamilyMember')!.valueChanges.subscribe((checked: boolean) => {
      const detailsCtrl = this.declarationForm.get('familyMemberDetails')!;
      if (!checked) {
        detailsCtrl.setValue('');
        detailsCtrl.clearValidators();
      } else {
        detailsCtrl.setValidators([Validators.required]);
      }
      detailsCtrl.updateValueAndValidity();
    });

    // Emit validity on every change
    this.declarationForm.statusChanges.subscribe(() => {
      this.formValidityChange.emit(this.declarationForm.valid);
    });

    // Emit initial validity
    this.formValidityChange.emit(this.declarationForm.valid);
  }
}
