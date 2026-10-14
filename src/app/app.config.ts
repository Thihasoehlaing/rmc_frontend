import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { apiMessageInterceptor } from './core/interceptors/api-message.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { sessionExpiryInterceptor } from './core/interceptors/session-expiry.interceptor';
import { documentLoadingInterceptor } from './core/interceptors/document-loading.interceptor';
import {
  DISPLAY_DATE_FORMAT,
  MALAYSIA_TIME_ZONE_OFFSET,
} from './shared/utils/date-time.util';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { dateFormat: DISPLAY_DATE_FORMAT, timezone: MALAYSIA_TIME_ZONE_OFFSET },
    },
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        documentLoadingInterceptor,
        authTokenInterceptor,
        sessionExpiryInterceptor,
        apiMessageInterceptor,
      ]),
    ),
  ],
};
