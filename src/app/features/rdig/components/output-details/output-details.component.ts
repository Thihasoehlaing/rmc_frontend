import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';

@Component({
    selector: 'app-output-details',
    standalone: true,
    imports: [ReactiveFormsModule, CustomSubheaderComponent, ValidationMessageComponent, NoteComponent, CharacterCounterComponent, ReviewBlockComponent],
    templateUrl: './output-details.component.html',
    styleUrls: ['./output-details.component.scss']
})
export class OutputDetailsComponent implements OnInit, OnDestroy {
    @Input({ required: true }) parentForm!: FormGroup;
    @Input() showHosComments = false;
    @Input() showRmcComments = false;
    @Input() showR1Comments = false;
    @Input() showR2Comments = false;
    @Input() showRdigChairComments = false;
    @Input() showVcComments = false;
    @Input() showCfoComments = false;

    get showAnyComments(): boolean {
      return this.showHosComments || this.showRmcComments ||
             this.showR1Comments || this.showR2Comments ||
             this.showRdigChairComments || this.showVcComments || this.showCfoComments;
    }
    @Input() workflow!: RdigWorkflowService;
    private readonly destroy$ = new Subject<void>();

    get projectDuration(): number | null {
        const duration = Number(this.parentForm.get('projectDetails.duration')?.value);
        return duration ? duration : null;
    }

    get journalQuantityOptions(): number[] {
        const minimum = this.minimumJournalQuantity;
        return minimum ? [1, 2, 3, 4].filter(quantity => quantity >= minimum) : [1, 2, 3, 4];
    }

    private get minimumJournalQuantity(): number | null {
        if (this.projectDuration === 12) return 1;
        if (this.projectDuration === 18 || this.projectDuration === 24) return 2;
        return null;
    }

    get outputForm() {
        return this.parentForm.get('outputs') as FormGroup;
    }

    private get reviewOutput(): FormGroup {
        return this.parentForm.get('reviewOutput') as FormGroup;
    }

    fc(name: string): FormControl {
        return this.reviewOutput.get(name) as FormControl;
    }

    ngOnInit(): void {
        const durationControl = this.parentForm.get('projectDetails.duration');
        durationControl?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.updateJournalQuantity());

        this.outputForm.get('journal.checked')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.updateJournalQuantity());

        this.setupConditionalValidator(
            'knowledgeTransfer.checked',
            'knowledgeTransfer.community',
            [Validators.required, Validators.maxLength(100)],
        );
        this.setupConditionalValidator(
            'externalGrant.checked',
            'externalGrant.scheme',
            [Validators.required, Validators.maxLength(100)],
        );
        this.setupConditionalValidator(
            'others.checked',
            'others.details',
            [Validators.required, Validators.maxLength(100)],
        );
        this.updateJournalQuantity();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private setupConditionalValidator(
        togglePath: string,
        detailPath: string,
        validators: ValidatorFn[],
    ): void {
        const toggleControl = this.outputForm.get(togglePath);
        const detailControl = this.outputForm.get(detailPath);
        if (!toggleControl || !detailControl) return;

        const updateValidators = (selected: boolean): void => {
            if (selected) {
                detailControl.setValidators(validators);
            } else {
                detailControl.clearValidators();
            }
            detailControl.updateValueAndValidity({ emitEvent: false });
        };

        toggleControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => updateValidators(!!value));

        updateValidators(!!toggleControl.value);
    }
    private updateJournalQuantity(): void {
        const quantityControl = this.outputForm.get('journal.quantity');
        const minimum = this.minimumJournalQuantity;
        const journalSelected = !!this.outputForm.get('journal.checked')?.value;

        if (!quantityControl) return;

        if (!journalSelected || minimum === null) {
            quantityControl.reset(null, { emitEvent: false });
            quantityControl.disable({ emitEvent: false });
            return;
        }

        quantityControl.enable({ emitEvent: false });
        quantityControl.setValidators([Validators.required, Validators.min(minimum)]);

        if (quantityControl.value !== null && Number(quantityControl.value) < minimum) {
            quantityControl.reset(null, { emitEvent: false });
        }

        quantityControl.updateValueAndValidity({ emitEvent: false });
    }
}
