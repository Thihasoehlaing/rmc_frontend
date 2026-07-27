import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, concatMap, defer, finalize, mapTo, of, shareReplay } from 'rxjs';

import { FormCacheService } from './form-cache.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class LayoutStartupService {
  private readonly formCache = inject(FormCacheService);
  private readonly notifications = inject(NotificationService);
  private startup$?: Observable<void>;

  readonly running = signal(false);
  readonly completed = signal(false);

  start(force = false): Observable<void> {
    if (this.startup$ && !force) {
      return this.startup$;
    }

    this.running.set(true);
    this.completed.set(false);

    this.startup$ = defer(() =>
      this.formCache.getActiveForms().pipe(
        catchError(() => of(null)),
        concatMap(() =>
          this.notifications.loadUnreadCount().pipe(
            catchError(() => of(null)),
          ),
        ),
        mapTo(void 0),
        finalize(() => {
          this.running.set(false);
          this.completed.set(true);
        }),
      ),
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));

    return this.startup$;
  }
}
