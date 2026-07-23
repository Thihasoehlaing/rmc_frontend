import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ActionLoadingService } from '../../../core/services/action-loading.service';
import { SVG_ICON_LOADING_SPINNER } from '../../icons/svg-icons';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

@Component({
  selector: 'app-action-loading-overlay',
  standalone: true,
  imports: [SvgIconComponent],
  templateUrl: './action-loading-overlay.component.html',
  styleUrl: './action-loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionLoadingOverlayComponent {
  readonly actionLoading = inject(ActionLoadingService);
  readonly loadingSpinnerIcon = SVG_ICON_LOADING_SPINNER;
}
