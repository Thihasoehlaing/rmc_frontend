import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActionButtonComponent } from '../../../../shared/components/action-button/action-button.component';
import { CustomHeaderComponent } from '../../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../../shared/components/note/note.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';

@Component({
    selector: 'app-research-activities',
    standalone: true,
    imports: [ReactiveFormsModule, ActionButtonComponent, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent, NoteComponent, ReviewBlockComponent],
    templateUrl: './research-activities.component.html',
    styleUrls: ['./research-activities.component.scss']
})
export class ResearchActivitiesComponent implements OnInit, OnDestroy {
    @Input({ required: true }) parentForm!: FormGroup;
    @Input() showHosComments = false;
    @Input() showRmcComments = false;
    @Input() showR1Comments = false;
    @Input() showR2Comments = false;
    @Input() showRdigChairComments = false;
    @Input() showVcComments = false;
    @Input() showCeoComments = false;
    @Input() workflow!: RdigWorkflowService;

    get showAnyComments(): boolean {
      return this.showHosComments || this.showRmcComments ||
             this.showR1Comments || this.showR2Comments ||
             this.showRdigChairComments || this.showVcComments || this.showCeoComments;
    }

    /** Project duration (months) — driven by projectDetails.duration; 0 = not set */
    projectDuration = signal<number>(0);

    private readonly activityMinMonth = 0;
    private readonly activityMaxMonth = 12;

    /** Research activity planning uses a fixed M0-M12 range. */
    months = computed(() =>
        Array.from({ length: this.activityMaxMonth - this.activityMinMonth + 1 }, (_, i) => this.activityMinMonth + i)
    );

    private subs: Subscription[] = [];

    get activities() {
        return this.parentForm.get('activities') as FormArray;
    }

    private get reviewProject(): FormGroup {
        return this.parentForm.get('reviewProject') as FormGroup;
    }

    fc(name: string): FormControl {
        return this.reviewProject.get(name) as FormControl;
    }

    constructor(private fb: FormBuilder) { }

    ngOnInit() {
        // Watch project duration from parent form
        const durationCtrl = this.parentForm.get('projectDetails.duration');
        if (durationCtrl) {
            // Set initial — keep 0 if not selected yet
            const initial = parseInt(durationCtrl.value, 10);
            if (initial > 0) {
                this.projectDuration.set(initial);
            }

            this.subs.push(
                durationCtrl.valueChanges.subscribe(val => {
                    const dur = parseInt(val, 10);
                    if (dur > 0) {
                        this.projectDuration.set(dur);
                        this.clampActivityMonths(dur);
                    }
                })
            );
        }

        // Watch activities changes for validation and duration updates
        this.subs.push(
            this.activities.valueChanges.subscribe(() => {
                this.normalizeAllActivityMonths();
                this.activities.updateValueAndValidity({ emitEvent: false });
            })
        );
    }

    ngOnDestroy() {
        this.subs.forEach(s => s.unsubscribe());
    }

    addActivity() {
        if (!this.canAddActivity()) return;
        const startMonth = this.activityMinMonth;

        const activityGroup = this.fb.group({
            name: ['', Validators.required],
            startMonth: [startMonth, Validators.required],
            endMonth: [startMonth, Validators.required],
            duration: [{ value: 0, disabled: true }]
        });

        this.ensureValidActivityMonths(activityGroup);

        // Auto-calculate duration and correct invalid month combinations before they become warnings.
        activityGroup.valueChanges.subscribe(() => {
            this.ensureValidActivityMonths(activityGroup);
        });

        this.activities.push(activityGroup);
        this.activities.updateValueAndValidity({ emitEvent: false });
    }

    removeActivity(index: number) {
        this.activities.removeAt(index);
        this.activities.updateValueAndValidity({ emitEvent: false });
    }

    getTimeline(start: any, end: any) {
        const s = parseInt((start || '0').toString());
        const e = parseInt((end || '0').toString());
        if (isNaN(s) || isNaN(e) || e < s) return this.months().map(() => false);
        return this.months().map(month => month >= s && month <= e);
    }

    canAddActivity(): boolean {
        return !this.workflow?.isFormReadOnly();
    }

    getAddActivityTitle(): string {
        if (!this.canAddActivity()) return 'This form is read-only';
        return '';
    }

    isStartMonthDisabled(index: number, month: number): boolean {
        return false;
    }

    isEndMonthDisabled(activity: any, month: number): boolean {
        return month < this.monthValue(activity.get('startMonth')?.value);
    }

    /** Clamp all activity months to the allowed activity planning range. */
    private clampActivityMonths(_maxMonth?: number): void {
        for (let i = 0; i < this.activities.length; i++) {
            this.ensureValidActivityMonths(this.activities.at(i) as FormGroup);
        }
        this.activities.updateValueAndValidity({ emitEvent: false });
    }

    private normalizeAllActivityMonths(): void {
        for (let i = 0; i < this.activities.length; i++) {
            this.ensureValidActivityMonths(this.activities.at(i) as FormGroup);
        }
    }

    private ensureValidActivityMonths(activityGroup: FormGroup): void {
        const startCtrl = activityGroup.get('startMonth');
        const endCtrl = activityGroup.get('endMonth');
        if (!startCtrl || !endCtrl) return;

        let start = this.monthValue(startCtrl.value);
        let end = this.monthValue(endCtrl.value);

        if (start < this.activityMinMonth) {
            start = this.activityMinMonth;
            startCtrl.setValue(start, { emitEvent: false });
        } else if (start > this.activityMaxMonth) {
            start = this.activityMaxMonth;
            startCtrl.setValue(start, { emitEvent: false });
        }

        if (end < start) {
            end = start;
            endCtrl.setValue(end, { emitEvent: false });
        } else if (end > this.activityMaxMonth) {
            end = this.activityMaxMonth;
            endCtrl.setValue(end, { emitEvent: false });
        }

        this.setDuration(activityGroup);
    }

    private setDuration(activityGroup: FormGroup): void {
        const start = this.monthValue(activityGroup.get('startMonth')?.value);
        const end = this.monthValue(activityGroup.get('endMonth')?.value);
        activityGroup.get('duration')?.setValue(Math.max(0, end - start), { emitEvent: false });
    }

    private monthValue(value: unknown): number {
        const month = parseInt(String(value ?? 0), 10);
        return Number.isFinite(month) ? month : 0;
    }
}
