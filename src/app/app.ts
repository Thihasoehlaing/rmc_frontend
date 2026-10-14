import { Component, inject } from '@angular/core';
import { ActionLoadingService } from './core/services/action-loading.service';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ActionLoadingOverlayComponent } from './shared/components/action-loading-overlay/action-loading-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, ActionLoadingOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly loading = inject(ActionLoadingService);
}
