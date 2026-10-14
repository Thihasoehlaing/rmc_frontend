import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ActionLoadingService } from '../../../core/services/action-loading.service';

@Component({
  selector: 'app-action-loading-overlay',
  standalone: true,
  templateUrl: './action-loading-overlay.component.html',
  styleUrl: './action-loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionLoadingOverlayComponent {
  readonly actionLoading = inject(ActionLoadingService);
}
