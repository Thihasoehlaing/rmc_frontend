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
    const status = this.stepStatuses[index];
    return this.submitAttempted && !status?.valid;
  }

  /** Amber: visited but has unmet required fields (before submit attempt) */
  isWarning(index: number): boolean {
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

  hasMissingFields(index: number): boolean {
    const status = this.stepStatuses[index];
    return !!status?.missingFields?.length;
  }

  showMissingTooltip(index: number): boolean {
    return (this.isWarning(index) || this.isError(index)) && this.hasMissingFields(index);
  }

  getTooltipTitle(index: number): string {
    return this.isError(index) ? 'Required Before Submit' : 'Missing Information';
  }

  getMissingFields(index: number): string[] {
    const status = this.stepStatuses[index];
    return status?.missingFields ?? [];
  }

  getMissingCountLabel(index: number): string {
    const count = this.getMissingFields(index).length;
    return `${count} ${count === 1 ? 'item' : 'items'}`;
  }

  getAriaLabel(index: number): string {
    const step = this.steps[index];
    const label = step?.label ?? `Step ${index + 1}`;
    if (!this.showMissingTooltip(index)) return label;
    return `${label}. ${this.getTooltipTitle(index)}: ${this.getMissingFields(index).join(', ')}`;
  }

  goToStep(index: number) {
    this.stepClick.emit(index + 1);
  }
}
