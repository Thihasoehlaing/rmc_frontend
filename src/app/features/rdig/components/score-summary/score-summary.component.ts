import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

/**
 * Displays the total score for Reviewer 1 and Reviewer 2
 * auto-calculated from all scoring inputs across the form.
 */
@Component({
  selector: 'app-score-summary',
  standalone: true,
  template: `
    <div class="score-summary">
      <div class="score-summary__item">
        <span class="material-icons">person</span>
        <span class="score-summary__label">Total Score — Reviewer 1</span>
        <span class="score-summary__value">{{ reviewer1Total }} / {{ maxTotal }}</span>
      </div>
      <div class="score-summary__item">
        <span class="material-icons">person</span>
        <span class="score-summary__label">Total Score — Reviewer 2</span>
        <span class="score-summary__value">{{ reviewer2Total }} / {{ maxTotal }}</span>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../../styles/index' as *;

    .score-summary {
      display: flex;
      gap: var(--space-4);
      flex-wrap: wrap;
      padding: var(--space-4) var(--space-5);
      background: var(--color-surface-nested);
      border: var(--control-border-width) solid var(--color-border-default);
      border-radius: var(--radius-lg);
    }

    .score-summary__item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex: 1;
      min-width: var(--size-score-summary-min-width);
      padding: var(--space-3) var(--space-4);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      border: var(--control-border-width) solid var(--color-border-default);

      .material-icons {
        font-size: var(--size-selection-control-large);
        color: var(--color-primary);
      }
    }

    .score-summary__label {
      flex: 1;
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-text-secondary);
    }

    .score-summary__value {
      font-size: var(--fs-lg);
      font-weight: var(--fw-bold);
      color: var(--color-primary);
    }
  `]
})
export class ScoreSummaryComponent {
  @Input() reviewer1Total = 0;
  @Input() reviewer2Total = 0;

  /**
   * Max possible total score:
   * Page 1: R1 score (10) + R2 score (10) = 10 each
   * Page 2 (10-point sections): executiveSummary, introduction, problemStatement,
   *   hypothesis, literatureReview, methodology, stakeholders = 7 × 10 = 70 each
   * Page 2 (5-point sections): researchAim, researchQuestions = 2 × 5 = 10 each
   * Budget final: R1 score (10) + R2 score (10) = 10 each
   * = 10 + 70 + 10 + 10 = 100 per reviewer
   */
  @Input() maxTotal = 100;
}
