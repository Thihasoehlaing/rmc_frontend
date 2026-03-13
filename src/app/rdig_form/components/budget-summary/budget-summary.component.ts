import { Component, Input, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { CharacterCounterComponent } from '../../../shared/components/character-counter/character-counter.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';

@Component({
    selector: 'app-budget-summary',
    standalone: true,
    imports: [DecimalPipe, ReactiveFormsModule, CustomHeaderComponent, CustomSubheaderComponent, CharacterCounterComponent, ReviewBlockComponent],
    templateUrl: './budget-summary.component.html',
    styleUrl: './budget-summary.component.scss'
})
export class BudgetSummaryComponent implements OnInit {
    @Input({ required: true }) parentForm!: FormGroup;
    @Input() showHosComments = false;
    @Input() showRmcComments = false;
    @Input() showR1Comments = false;
    @Input() showR2Comments = false;
    @Input() showRdigChairComments = false;
    @Input() showVcComments = false;
    @Input() showCeoComments = false;

    get showAnyComments(): boolean {
      return this.showHosComments || this.showRmcComments ||
             this.showR1Comments || this.showR2Comments ||
             this.showRdigChairComments || this.showVcComments || this.showCeoComments;
    }
    @Input() workflow!: RdigWorkflowService;

    get budgetForm() {
        return this.parentForm.get('budget') as FormGroup;
    }

    get projectDetails() {
        return this.parentForm.get('projectDetails') as FormGroup;
    }

    get category() {
        return this.projectDetails.get('category')?.value;
    }

    // Get FormArrays
    get studentAllowances() { return this.budgetForm.get('studentAllowances') as FormArray; }
    get travelAccommodation() { return this.budgetForm.get('travelAccommodation') as FormArray; }
    get materialsSupplies() { return this.budgetForm.get('materialsSupplies') as FormArray; }
    get specialServices() { return this.budgetForm.get('specialServices') as FormArray; }

    constructor(private fb: FormBuilder) { }

    ngOnInit() {
        // Watch for internal calculation changes
        this.budgetForm.valueChanges.subscribe(() => {
            this.calculateTotal();
        });
    }

    addBudgetRow(array: FormArray) {
        const row = this.fb.group({
            description: ['', Validators.required],
            amount: [null, [Validators.required, Validators.min(0.01)]],
            remarks: ['', [Validators.required, Validators.maxLength(300)]]
        });
        array.push(row);
    }

    removeBudgetRow(array: FormArray, index: number) {
        array.removeAt(index);
    }

    calculateTotal() {
        const sum = (arr: FormArray) => arr.controls.reduce((acc, ctrl) => acc + (ctrl.get('amount')?.value || 0), 0);
        const total = sum(this.studentAllowances) + sum(this.travelAccommodation) +
            sum(this.materialsSupplies) + sum(this.specialServices);

        this.budgetForm.get('totalRequest')?.setValue(total, { emitEvent: false });
    }

    get isBudgetInvalidRange(): boolean {
        const total = this.budgetForm.get('totalRequest')?.value ?? 0;
        if (this.category === 'S&T') return total < 20000 || total > 30000;
        if (this.category === 'Non S&T') return total < 5000 || total > 10000;
        return false;
    }

    get budgetRangeMessage(): string {
        if (this.category === 'S&T') return 'RM 20,000 – RM 30,000';
        if (this.category === 'Non S&T') return 'RM 5,000 – RM 10,000';
        return '';
    }

    private get reviewBudget(): FormGroup {
        return this.parentForm.get('reviewBudget') as FormGroup;
    }

    fc(name: string): FormControl {
        return this.reviewBudget.get(name) as FormControl;
    }
}
