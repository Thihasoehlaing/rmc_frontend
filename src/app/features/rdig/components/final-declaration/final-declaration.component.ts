import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { ApprovalCardComponent } from '../approval-card/approval-card.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';

@Component({
    selector: 'app-final-declaration',
    standalone: true,
    imports: [ReactiveFormsModule, ValidationMessageComponent, CharacterCounterComponent, ReviewBlockComponent, ApprovalCardComponent],
    templateUrl: './final-declaration.component.html',
    styleUrl: './final-declaration.component.scss'
})
export class FinalDeclarationComponent implements OnInit, OnDestroy {
    @Input({ required: true }) parentForm!: FormGroup;
    @Input() showHosComments = false;
    @Input() showRmcComments = false;
    @Input() showR1Comments = false;
    @Input() showR2Comments = false;
    @Input() showRdigChairComments = false;
    @Input() showVcComments = false;
    @Input() showCeoComments = false;
    @Input() workflow!: RdigWorkflowService;
    @Input() reviewer1Total = 0;
    @Input() reviewer2Total = 0;

    get showAnyComments(): boolean {
      return this.showHosComments || this.showRmcComments ||
             this.showR1Comments || this.showR2Comments ||
             this.showRdigChairComments || this.showVcComments || this.showCeoComments;
    }

    /** Potential reviewers are no longer sourced from frontend dummy auth users. */
    reviewers: { id: string; name: string }[] = [];

    private rmcSub?: Subscription;

    ngOnInit(): void {
      // When RMC status changes to 'reject', reset reviewer assignments
      this.rmcSub = this.ac('rmcStatus').valueChanges.subscribe(val => {
        if (val === 'reject') {
          this.ac('reviewer1Assignment').setValue('');
          this.ac('reviewer2Assignment').setValue('');
        }
      });
    }

    ngOnDestroy(): void {
      this.rmcSub?.unsubscribe();
    }

    get declarationForm() {
        return this.parentForm.get('finalDeclaration') as FormGroup;
    }

    private get reviewDeclaration(): FormGroup {
        return this.parentForm.get('reviewDeclaration') as FormGroup;
    }

    private get approvals(): FormGroup {
        return this.parentForm.get('approvals') as FormGroup;
    }

    fc(name: string): FormControl {
        return this.reviewDeclaration.get(name) as FormControl;
    }

    ac(name: string): FormControl {
        return this.approvals.get(name) as FormControl;
    }
}
