import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';

@Component({
	selector: 'app-finance-claim-declaration',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		CustomSubheaderComponent,
		ValidationMessageComponent
	],
	templateUrl: './Declaration.html',
	styleUrls: ['./Declaration.scss']
})
export class FinanceClaimDeclarationComponent implements OnInit {
	private fb = inject(FormBuilder);

	/** Emits the form's validity state whenever it changes. */
	@Output() formValidityChange = new EventEmitter<boolean>();

	/** Exposed publicly so the shell can call declarationForm.markAllAsTouched() via @ViewChild. */
	declarationForm!: FormGroup;

	ngOnInit(): void {
		this.declarationForm = this.fb.group({
			// Main agreement (required)
			agreeToDeclaration: [false, [Validators.requiredTrue]],
			// Acknowledgment of accuracy (required)
			acknowledgeAccuracy: [false, [Validators.requiredTrue]],
		});

		// Emit validity on every change
		this.declarationForm.statusChanges.subscribe(() => {
			this.formValidityChange.emit(this.declarationForm.valid);
		});

		// Emit initial validity
		this.formValidityChange.emit(this.declarationForm.valid);
	}
}
