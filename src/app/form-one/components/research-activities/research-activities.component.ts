import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomHeaderComponent } from '../../../shared/components/custom-header/custom-header.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { NoteComponent } from '../../../shared/components/note/note.component';

@Component({
    selector: 'app-research-activities',
    standalone: true,
    imports: [ReactiveFormsModule, CustomHeaderComponent, CustomSubheaderComponent, ValidationMessageComponent, NoteComponent],
    templateUrl: './research-activities.component.html',
    styleUrls: ['./research-activities.component.scss']
})
export class ResearchActivitiesComponent implements OnInit, OnDestroy {
    @Input({ required: true }) parentForm!: FormGroup;

    /** Project duration (months) — driven by projectDetails.duration */
    projectDuration = signal<number>(24);

    /** Available months computed from duration */
    months = computed(() => Array.from({ length: this.projectDuration() }, (_, i) => i + 1));

    /** Validation warnings (non-blocking but visible) */
    validationWarnings = signal<string[]>([]);

    private subs: Subscription[] = [];

    get activities() {
        return this.parentForm.get('activities') as FormArray;
    }

    constructor(private fb: FormBuilder) { }

    ngOnInit() {
        // Watch project duration from parent form
        const durationCtrl = this.parentForm.get('projectDetails.duration');
        if (durationCtrl) {
            // Set initial
            const initial = parseInt(durationCtrl.value, 10);
            if (initial > 0) this.projectDuration.set(initial);

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

        if (this.activities.length === 0) {
            this.addActivity();
        }

        // Watch activities changes for validation
        this.subs.push(
            this.activities.valueChanges.subscribe(() => this.validateSequence())
        );
    }

    ngOnDestroy() {
        this.subs.forEach(s => s.unsubscribe());
    }

    addActivity() {
        const nextStart = this.getNextAvailableStart();
        const maxMonth = this.projectDuration();

        const activityGroup = this.fb.group({
            name: ['', Validators.required],
            startMonth: [nextStart, Validators.required],
            endMonth: [Math.min(nextStart, maxMonth), Validators.required],
            duration: [{ value: 1, disabled: true }]
        });

        // Auto-calculate duration
        activityGroup.valueChanges.subscribe(val => {
            const start = parseInt((val.startMonth || '0').toString());
            const end = parseInt((val.endMonth || '0').toString());
            if (end >= start) {
                activityGroup.get('duration')?.setValue(end - start + 1, { emitEvent: false });
            } else {
                activityGroup.get('duration')?.setValue(0, { emitEvent: false });
            }
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

    /** Get next start month based on last activity's end */
    private getNextAvailableStart(): number {
        if (this.activities.length === 0) return 1;
        const lastEnd = this.activities.at(this.activities.length - 1).get('endMonth')?.value;
        const next = parseInt(lastEnd, 10) + 1;
        return Math.min(next, this.projectDuration());
    }

    /** Clamp all activity months to max duration when duration changes */
    private clampActivityMonths(maxMonth: number): void {
        for (let i = 0; i < this.activities.length; i++) {
            const ctrl = this.activities.at(i);
            const start = parseInt(ctrl.get('startMonth')?.value, 10);
            const end = parseInt(ctrl.get('endMonth')?.value, 10);
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
        const firstStart = parseInt(this.activities.at(0).get('startMonth')?.value, 10);
        if (firstStart !== 1) {
            warnings.push('First activity must start at Month 1.');
        }

        // Rule 2: Each activity end >= start
        for (let i = 0; i < this.activities.length; i++) {
            const start = parseInt(this.activities.at(i).get('startMonth')?.value, 10);
            const end = parseInt(this.activities.at(i).get('endMonth')?.value, 10);
            if (end < start) {
                warnings.push(`Activity ${i + 1}: End month must be ≥ Start month.`);
            }
        }

        // Rule 3: No gaps — each activity's start should be previous activity's end + 1
        for (let i = 1; i < this.activities.length; i++) {
            const prevEnd = parseInt(this.activities.at(i - 1).get('endMonth')?.value, 10);
            const currStart = parseInt(this.activities.at(i).get('startMonth')?.value, 10);
            if (currStart !== prevEnd + 1) {
                warnings.push(`Activity ${i + 1}: Should start at Month ${prevEnd + 1} (no gaps allowed).`);
            }
        }

        // Rule 4: Last activity must end at project duration month
        const lastEnd = parseInt(this.activities.at(this.activities.length - 1).get('endMonth')?.value, 10);
        if (lastEnd !== maxMonth) {
            warnings.push(`Last activity must end at Month ${maxMonth} (project duration).`);
        }

        this.validationWarnings.set(warnings);
    }
}
