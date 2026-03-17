import { Component, Input } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';

@Component({
    selector: 'app-output-details',
    standalone: true,
    imports: [ReactiveFormsModule, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent, ReviewBlockComponent],
    templateUrl: './output-details.component.html',
    styleUrls: ['./output-details.component.scss']
})
export class OutputDetailsComponent {
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

    get outputForm() {
        return this.parentForm.get('outputs') as FormGroup;
    }

    private get reviewOutput(): FormGroup {
        return this.parentForm.get('reviewOutput') as FormGroup;
    }

    fc(name: string): FormControl {
        return this.reviewOutput.get(name) as FormControl;
    }
}
