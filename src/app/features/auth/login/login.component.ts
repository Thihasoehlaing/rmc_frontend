import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private readonly APU_RETRY_KEY = 'rmc_apu_login_retry';
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private returnRoute = '/dashboard';

  readonly currentYear = new Date().getFullYear();
  readonly showTestingLogin = !environment.production;
  readonly testingAccounts = this.authService.getDemoAccounts();
  readonly isLoading = signal(false);
  readonly loginError = signal('');

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    this.returnRoute = this.getReturnRoute();

    if (!code) {
      if (this.authService.isAuthenticated()) {
        void this.router.navigateByUrl(this.returnRoute);
        return;
      }

      return;
    }

    // APU codes are single-use. Remove the code immediately so refresh cannot reuse it.
    this.location.replaceState('/login');
    this.isLoading.set(true);
    this.authService.completeApuLogin(code).subscribe({
      next: () => {
        sessionStorage.removeItem(this.APU_RETRY_KEY);
        void this.router.navigateByUrl(this.returnRoute);
      },
      error: (error: unknown) => {
        if (
          this.isExpiredOrInvalidCode(error) &&
          !sessionStorage.getItem(this.APU_RETRY_KEY)
        ) {
          sessionStorage.setItem(this.APU_RETRY_KEY, '1');
          this.authService.startApuLogin('/login');
          return;
        }

        this.isLoading.set(false);
        this.loginError.set(this.getErrorMessage(error));
      },
    });
  }

  loginWithApu(): void {
    sessionStorage.removeItem(this.APU_RETRY_KEY);
    this.loginError.set('');
    this.isLoading.set(true);
    this.authService.startApuLogin(this.authService.getCurrentRoute());
  }

  loginForTesting(username = 'dr_john'): void {
    this.loginError.set('');
    this.isLoading.set(true);

    if (!this.authService.loginAsTestingUser(username)) {
      this.isLoading.set(false);
      this.loginError.set('Testing login is not available in this environment.');
      return;
    }

    void this.router.navigateByUrl(this.returnRoute);
  }

  private getReturnRoute(): string {
    return this.authService.getSafeReturnRoute(
      this.route.snapshot.queryParamMap.get('returnTo'),
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message ?? error.error?.error;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage.charAt(0).toUpperCase() + apiMessage.slice(1);
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'We could not complete your APU sign-in. Please try again.';
  }

  private isExpiredOrInvalidCode(error: unknown): boolean {
    const message =
      error instanceof Error
        ? error.message
        : error instanceof HttpErrorResponse
          ? String(error.error?.message ?? error.error?.error ?? '')
          : '';

    return /code.*(?:expired|invalid)|(?:expired|invalid).*code/i.test(message);
  }
}
