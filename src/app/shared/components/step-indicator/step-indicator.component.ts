import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface WizardStep {
  label: string;
  icon: string; // material icon name
}

export interface StepStatus {
  visited: boolean;
  valid: boolean;
  missingFields: string[];
}

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  imports: [],
  templateUrl: './step-indicator.component.html',
  styleUrls: ['./step-indicator.component.scss']
})
export class StepIndicatorComponent {
  @Input() currentStep = 1;
  @Input() steps: WizardStep[] = [];
  @Input() stepStatuses: StepStatus[] = [];
  /** When true, warning steps escalate to red error state */
  @Input() submitAttempted = false;
  @Output() stepClick = new EventEmitter<number>();

  isActive(index: number) { return index + 1 === this.currentStep; }

  /** Green: visited and all required fields valid */
  isComplete(index: number): boolean {
    if (this.isActive(index)) return false;
    const status = this.stepStatuses[index];
    return !!status?.visited && status.valid;
  }

  /** Red: submit was attempted but step still has missing fields */
  isError(index: number): boolean {
    if (this.isActive(index)) return false;
    const status = this.stepStatuses[index];
    return this.submitAttempted && !!status?.visited && !status?.valid;
  }

  /** Amber: visited but has unmet required fields (before submit attempt) */
  isWarning(index: number): boolean {
    if (this.isActive(index)) return false;
    if (this.isError(index)) return false;
    const status = this.stepStatuses[index];
    return !!status?.visited && !status?.valid;
  }

  isPending(index: number): boolean {
    return !this.isActive(index) && !this.isComplete(index) && !this.isWarning(index) && !this.isError(index);
  }

  /** Connector is filled only when the left step is complete (not just visited) */
  isConnectorFilled(index: number): boolean {
    return this.isComplete(index);
  }

  getMissingTooltip(index: number): string {
    const status = this.stepStatuses[index];
    if (!status?.missingFields?.length) return '';
    return 'Missing: ' + status.missingFields.join(', ');
  }

  goToStep(index: number) {
    this.stepClick.emit(index + 1);
  }
}
