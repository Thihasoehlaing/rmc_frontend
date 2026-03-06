import { Component, Input } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';

@Component({
    selector: 'app-output-details',
    standalone: true,
    imports: [ReactiveFormsModule, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent],
    templateUrl: './output-details.component.html',
    styleUrls: ['./output-details.component.scss']
})
export class OutputDetailsComponent {
    @Input({ required: true }) parentForm!: FormGroup;

    get outputForm() {
        return this.parentForm.get('outputs') as FormGroup;
    }
}
