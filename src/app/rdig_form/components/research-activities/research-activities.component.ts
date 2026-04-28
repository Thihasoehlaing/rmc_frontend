import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../shared/components/note/note.component';
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

    /** Available months computed from duration */
    months = computed(() => Array.from({ length: this.projectDuration() }, (_, i) => i + 1));

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
                if (this.activities.length === 0) this.addActivity();
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

        if (this.activities.length === 0 && this.projectDuration() > 0) {
            this.addActivity();
        }

        // Watch activities changes for validation and cascade updates
        this.subs.push(
            this.activities.valueChanges.subscribe(() => {
                this.updateCascade();
            })
        );
    }

    ngOnDestroy() {
        this.subs.forEach(s => s.unsubscribe());
    }

    addActivity() {
        if (!this.canAddActivity()) return;
        const isFirst = this.activities.length === 0;
        const maxMonth = this.projectDuration();
        // First activity: start = 1 (user-editable); subsequent: start = prev end (auto-locked)
        const startMonth = isFirst
            ? 1
            : parseInt(String(this.activities.at(this.activities.length - 1).get('endMonth')?.value || '1'), 10);

        const activityGroup = this.fb.group({
            name: ['', Validators.required],
            startMonth: [{ value: startMonth, disabled: true }, Validators.required],
            endMonth: [Math.min(startMonth + 1, maxMonth), Validators.required],
            duration: [{ value: 1, disabled: true }]
        });

        this.ensureValidActivityMonths(activityGroup);

        // Auto-calculate duration and correct invalid month combinations before they become warnings.
        activityGroup.valueChanges.subscribe(() => {
            this.ensureValidActivityMonths(activityGroup);
        });

        this.activities.push(activityGroup);
        this.updateCascade();
    }

    removeActivity(index: number) {
        this.activities.removeAt(index);
        this.updateCascade();
    }

    getTimeline(start: any, end: any) {
        const s = parseInt((start || '0').toString());
        const e = parseInt((end || '0').toString());
        const total = this.projectDuration();
        if (isNaN(s) || isNaN(e) || e < s) return Array.from({ length: total }, () => false);
        return Array.from({ length: total }, (_, i) => i + 1 >= s && i + 1 <= e);
    }

    canAddActivity(): boolean {
        const maxMonth = this.projectDuration();
        if (!maxMonth || this.workflow?.isFormReadOnly()) return false;
        if (this.activities.length === 0) return true;

        const lastEnd = this.monthValue(this.activities.at(this.activities.length - 1).get('endMonth')?.value);
        return lastEnd < maxMonth;
    }

    getAddActivityTitle(): string {
        if (!this.projectDuration()) return 'Select a Project Duration first';
        if (!this.canAddActivity()) return 'The activity timeline already reaches the project end month';
        return '';
    }

    isStartMonthDisabled(index: number, month: number): boolean {
        return true;
    }

    isEndMonthDisabled(activity: any, month: number): boolean {
        return month <= this.monthValue(activity.get('startMonth')?.value);
    }

    /** Update startMonth of all non-first activities to equal prev activity's endMonth */
    private updateCascade(): void {
        if (this.activities.length > 0) {
            const firstActivity = this.activities.at(0) as FormGroup;
            firstActivity.get('startMonth')?.disable({ emitEvent: false });
            firstActivity.get('startMonth')?.setValue(1, { emitEvent: false });
            this.ensureValidActivityMonths(firstActivity);
        }

        for (let i = 1; i < this.activities.length; i++) {
            const prevEnd = this.monthValue(this.activities.at(i - 1).get('endMonth')?.value);
            const activity = this.activities.at(i) as FormGroup;
            activity.get('startMonth')?.disable({ emitEvent: false });
            activity.get('startMonth')?.setValue(prevEnd, { emitEvent: false });
            this.ensureValidActivityMonths(activity);
        }

        this.activities.updateValueAndValidity({ emitEvent: false });
    }

    /** Clamp all activity months to max duration when duration changes */
    private clampActivityMonths(maxMonth: number): void {
        for (let i = 0; i < this.activities.length; i++) {
            this.ensureValidActivityMonths(this.activities.at(i) as FormGroup, maxMonth);
        }
        this.updateCascade();
    }

    private ensureValidActivityMonths(activityGroup: FormGroup, maxMonth = this.projectDuration()): void {
        if (!maxMonth) return;

        const startCtrl = activityGroup.get('startMonth');
        const endCtrl = activityGroup.get('endMonth');
        if (!startCtrl || !endCtrl) return;

        let start = this.monthValue(startCtrl.value);
        let end = this.monthValue(endCtrl.value);

        if (start >= maxMonth) {
            start = Math.max(1, maxMonth - 1);
            startCtrl.setValue(start, { emitEvent: false });
        }

        if (end > maxMonth || end <= start) {
            end = Math.min(maxMonth, start + 1);
            endCtrl.setValue(end, { emitEvent: false });
        }

        this.setDuration(activityGroup);
    }

    private setDuration(activityGroup: FormGroup): void {
        const start = this.monthValue(activityGroup.get('startMonth')?.value);
        const end = this.monthValue(activityGroup.get('endMonth')?.value);
        activityGroup.get('duration')?.setValue(end > start ? end - start + 1 : 0, { emitEvent: false });
    }

    private monthValue(value: unknown): number {
        const month = parseInt(String(value ?? 0), 10);
        return Number.isFinite(month) ? month : 0;
    }
}
