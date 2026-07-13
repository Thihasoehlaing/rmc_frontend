import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { apiMessageInterceptor } from './core/interceptors/api-message.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { sessionExpiryInterceptor } from './core/interceptors/session-expiry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        authTokenInterceptor,
        sessionExpiryInterceptor,
        apiMessageInterceptor,
      ]),
    ),
  ],
};
