import { Component, Input } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';

@Component({
    selector: 'app-final-declaration',
    standalone: true,
    imports: [ReactiveFormsModule, CustomHeaderComponent, ValidationMessageComponent, CharacterCounterComponent],
    templateUrl: './final-declaration.component.html',
    styleUrls: ['./final-declaration.component.scss']
})
export class FinalDeclarationComponent {
    @Input({ required: true }) parentForm!: FormGroup;

    get declarationForm() {
        return this.parentForm.get('finalDeclaration') as FormGroup;
    }
}
