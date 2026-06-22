import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SvgIconDefinition } from '../../icons/svg-icons';

@Component({
  selector: 'app-svg-icon',
  standalone: true,
  templateUrl: './svg-icon.component.html',
  styleUrl: './svg-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SvgIconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  @Input({ required: true }) icon!: SvgIconDefinition;
  @Input() size = '1em';
  @Input() label = '';

  get svgMarkup(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg class="svg-icon" viewBox="${this.icon.viewBox}" width="100%" height="100%" aria-hidden="true" focusable="false">${this.icon.markup}</svg>`,
    );
  }
}
