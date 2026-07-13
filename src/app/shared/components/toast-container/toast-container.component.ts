import { Component, inject } from '@angular/core';

import { ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  iconFor(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: 'check_circle',
      error: 'error',
      info: 'info',
    };

    return icons[type];
  }

  titleFor(type: ToastType): string {
    const titles: Record<ToastType, string> = {
      success: 'Success',
      error: 'Action needed',
      info: 'Notice',
    };

    return titles[type];
  }
}
