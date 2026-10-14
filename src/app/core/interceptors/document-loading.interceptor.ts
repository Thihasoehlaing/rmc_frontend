import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, finalize } from 'rxjs';

import { ActionLoadingService } from '../services/action-loading.service';

/** One document loader for API reads and writes, including concurrent requests. */
export const documentLoadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method === 'OPTIONS' || /(?:^|\/)assets\//.test(request.url)) {
    return next(request);
  }
  const loading = inject(ActionLoadingService);
  return defer(() => {
    const id = loading.beginRequest(request.method);
    return next(request).pipe(finalize(() => loading.end(id)));
  });
};
