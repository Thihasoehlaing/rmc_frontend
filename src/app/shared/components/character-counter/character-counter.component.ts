import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-character-counter',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="character-counter" [class.max-reached]="current >= max">
      {{ current }} / {{ max }}
    </div>
  `,
    styles: [`
    @use '../../../../styles/index' as *;

    .character-counter {
      font-size: var(--fs-xs);
      color: var(--color-letter-counter);
      text-align: right;
      padding: var(--space-1) 0;
      font-weight: var(--fw-medium);
      transition: color var(--transition-fast);

      &.max-reached {
        color: var(--color-warning);
        font-weight: var(--fw-bold);
      }
    }
  `]
})
export class CharacterCounterComponent {
    @Input() current: number = 0;
    @Input() max: number = 0;
}
