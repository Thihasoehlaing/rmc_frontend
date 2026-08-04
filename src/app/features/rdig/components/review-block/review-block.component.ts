import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { CharacterCounterComponent } from '../../../../shared/components/character-counter/character-counter.component';
import { syncRequiredValidator } from '../../../../shared/utils/form.utils';

/**
 * Reusable review comment block with optional score dropdown.
 * Used across all RDIG form pages for HOS, Reviewer 1/2, RMC, etc.
 *
 * Integrates with:
 *  - Existing CharacterCounterComponent (textarea letter counter)
 *  - Comment toggle visibility via [visible] input
 *  - Role-based editability via [readonly] input
 */
@Component({
  selector: 'app-review-block',
  standalone: true,
  imports: [ReactiveFormsModule, CharacterCounterComponent],
  template: `
    @if (visible) {
      <div class="review-block" [class.review-block--readonly]="readonly">
        <div class="review-block__header">
          <span class="material-icons review-block__icon">{{ icon }}</span>
          <span class="review-block__label">{{ label }}</span>
        </div>

        <div class="review-block__body" [class.review-block__body--with-score]="showScore">
          <!-- Comment textarea -->
          <div class="review-block__comment">
            <textarea
              class="input--textarea"
              [class.input--disabled]="readonly"
              [formControl]="commentControl"
              [maxlength]="maxChars"
              [readonly]="readonly"
            ></textarea>
            <app-character-counter
              [current]="commentControl.value?.length ?? 0"
              [max]="maxChars">
            </app-character-counter>
          </div>

          <!-- Optional score dropdown -->
          @if (showScore) {
            <div class="review-block__score">
              <label class="form-label">Score</label>
              <select
                class="input--select"
                [class.input--disabled]="scoreDisabled || readonly"
                [formControl]="scoreControl">
                <option value="" disabled>—</option>
                @for (s of scoreRange; track s) {
                  <option [value]="s">{{ s }}</option>
                }
              </select>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    @use '../../../../../styles/index' as *;

    .review-block {
      padding: var(--space-4) var(--space-5);
      background: var(--color-surface-nested);
      border: var(--control-border-width) solid var(--color-border-default);
      border-left: var(--control-border-width-accent) solid var(--color-primary);
      border-radius: var(--radius-md);

      &--readonly {
        border-left-color: var(--color-text-secondary);
        opacity: 0.85;
      }
    }

    .review-block__header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      font-size: var(--fs-xs);
      font-weight: var(--fw-bold);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-label);
      color: var(--color-text-secondary);
    }

    .review-block__icon {
      font-size: var(--font-size-subtitle);
      color: var(--color-primary);
    }

    .review-block__label {
      flex: 1;
    }

    .badge--readonly {
      font-size: var(--font-size-caption);
      padding: var(--form-space-1) var(--form-space-2);
      border-radius: var(--radius-full);
      background: var(--color-surface-hover);
      color: var(--color-text-secondary);
      font-weight: var(--fw-medium);
      text-transform: uppercase;
    }

    .review-block__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);

      &--with-score {
        flex-direction: row;
        align-items: flex-start;
        gap: var(--space-4);
      }
    }

    .review-block__comment {
      flex: 1;
      min-width: 0;
    }

    .review-block__score {
      flex: 0 0 var(--size-review-score-width);

      .form-label {
        font-size: var(--fs-xs);
        margin-bottom: var(--space-1);
        display: block;
        color: var(--color-text-secondary);
      }
    }
  `]
})
export class ReviewBlockComponent implements OnChanges {
  /** Label shown in the header (e.g. "HOS Comment", "Reviewer 1") */
  @Input() label = 'Comment';
  /** Material icon name */
  @Input() icon = 'chat_bubble_outline';
  /** Whether to show this block */
  @Input() visible = true;
  /** Whether the fields are read-only */
  @Input() readonly = true;
  /** Max characters for the textarea */
  @Input() maxChars = 1000;
  /** Whether to show the score dropdown */
  @Input() showScore = false;
  /** Whether the score dropdown is disabled (independent of readonly) */
  @Input() scoreDisabled = true;
  /** Max score value (generates 0..maxScore range) */
  @Input() maxScore = 10;

  /** Form control for the comment text */
  @Input() commentControl = new FormControl('');
  /** Form control for the score */
  @Input() scoreControl = new FormControl('');

  get scoreRange(): number[] {
    return Array.from({ length: this.maxScore + 1 }, (_, i) => i);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('scoreDisabled' in changes || 'readonly' in changes || 'scoreControl' in changes) {
      const disabled = this.scoreDisabled || this.readonly;
      disabled
        ? this.scoreControl.disable({ emitEvent: false })
        : this.scoreControl.enable({ emitEvent: false });
    }
    // When editable, make the comment field required; remove when read-only
    if ('readonly' in changes || 'commentControl' in changes) {
      syncRequiredValidator(this.commentControl, this.readonly);
    }
  }
}

