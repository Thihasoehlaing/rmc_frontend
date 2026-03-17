import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../shared/components/note/note.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';

@Component({
    selector: 'app-research-activities',
    standalone: true,
    imports: [ReactiveFormsModule, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent, NoteComponent, ReviewBlockComponent],
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

    /** Validation warnings (non-blocking but visible) */
    validationWarnings = signal<string[]>([]);

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
                        this.validateSequence();
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
                this.validateSequence();
            })
        );
    }

    ngOnDestroy() {
        this.subs.forEach(s => s.unsubscribe());
    }

    addActivity() {
        if (!this.projectDuration()) return; // guard: no duration set
        const isFirst = this.activities.length === 0;
        const maxMonth = this.projectDuration();
        // First activity: start = 1 (user-editable); subsequent: start = prev end (auto-locked)
        const startMonth = isFirst
            ? 1
            : parseInt(String(this.activities.at(this.activities.length - 1).get('endMonth')?.value || '1'), 10);

        const activityGroup = this.fb.group({
            name: ['', Validators.required],
            startMonth: [{ value: startMonth, disabled: !isFirst }, Validators.required],
            endMonth: [Math.min(startMonth + 1, maxMonth), Validators.required],
            duration: [{ value: 1, disabled: true }]
        });

        // Auto-calculate duration (use .get().value to handle disabled startMonth)
        activityGroup.valueChanges.subscribe(() => {
            const start = parseInt(String(activityGroup.get('startMonth')?.value || '0'), 10);
            const end = parseInt(String(activityGroup.get('endMonth')?.value || '0'), 10);
            activityGroup.get('duration')?.setValue(
                end > start ? end - start + 1 : 0,
                { emitEvent: false }
            );
        });

        this.activities.push(activityGroup);
        this.validateSequence();
    }

    removeActivity(index: number) {
        this.activities.removeAt(index);
        this.validateSequence();
    }

    getTimeline(start: any, end: any) {
        const s = parseInt((start || '0').toString());
        const e = parseInt((end || '0').toString());
        const total = this.projectDuration();
        if (isNaN(s) || isNaN(e) || e < s) return Array.from({ length: total }, () => false);
        return Array.from({ length: total }, (_, i) => i + 1 >= s && i + 1 <= e);
    }

    /** Update startMonth of all non-first activities to equal prev activity's endMonth */
    private updateCascade(): void {
        for (let i = 1; i < this.activities.length; i++) {
            const prevEnd = parseInt(String(this.activities.at(i - 1).get('endMonth')?.value ?? 1), 10);
            this.activities.at(i).get('startMonth')?.setValue(prevEnd, { emitEvent: false });
        }
    }

    /** Clamp all activity months to max duration when duration changes */
    private clampActivityMonths(maxMonth: number): void {
        for (let i = 0; i < this.activities.length; i++) {
            const ctrl = this.activities.at(i);
            const start = parseInt(String(ctrl.get('startMonth')?.value ?? 0), 10);
            const end = parseInt(String(ctrl.get('endMonth')?.value ?? 0), 10);
            if (start > maxMonth) ctrl.get('startMonth')?.setValue(maxMonth, { emitEvent: false });
            if (end > maxMonth) ctrl.get('endMonth')?.setValue(maxMonth, { emitEvent: false });
        }
    }

    /** Validate activity sequence rules and produce warnings */
    validateSequence(): void {
        const warnings: string[] = [];
        const maxMonth = this.projectDuration();

        if (this.activities.length === 0) {
            this.validationWarnings.set(warnings);
            return;
        }

        // Rule 1: First activity must start at month 1
        const firstStart = parseInt(String(this.activities.at(0).get('startMonth')?.value ?? 0), 10);
        if (firstStart !== 1) {
            warnings.push('First activity must start at Month 1.');
        }

        // Rule 2: Each activity end must be > start
        for (let i = 0; i < this.activities.length; i++) {
            const start = parseInt(String(this.activities.at(i).get('startMonth')?.value ?? 0), 10);
            const end = parseInt(String(this.activities.at(i).get('endMonth')?.value ?? 0), 10);
            if (end <= start) {
                warnings.push(`Activity ${i + 1}: End month must be after Start month.`);
            }
        }

        // Rule 3: Continuous — each activity's start must equal previous activity's end
        for (let i = 1; i < this.activities.length; i++) {
            const prevEnd = parseInt(String(this.activities.at(i - 1).get('endMonth')?.value ?? 0), 10);
            const currStart = parseInt(String(this.activities.at(i).get('startMonth')?.value ?? 0), 10);
            if (currStart !== prevEnd) {
                warnings.push(`Activity ${i + 1}: Should start at Month ${prevEnd} (equal to previous end).`);
            }
        }

        // Rule 4: Last activity must end at project duration month
        const lastEnd = parseInt(String(this.activities.at(this.activities.length - 1).get('endMonth')?.value ?? 0), 10);
        if (lastEnd !== maxMonth) {
            warnings.push(`Last activity must end at Month ${maxMonth} (project duration).`);
        }

        this.validationWarnings.set(warnings);
    }
}
