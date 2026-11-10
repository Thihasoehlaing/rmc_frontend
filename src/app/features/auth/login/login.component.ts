import { environment } from '../../../../environments/environment';
import { InputDirective } from '../../../shared/components/settings-ui/settings-ui.components';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from '../../../shared/components/dropdown/dropdown.component';
import { firstValueFrom } from 'rxjs';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { TestingLoginAccount, TestingLoginService } from './testing-login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [InputDirective,FormsModule, DropdownComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  standardOptions0() { return [{value: '', label: 'All roles'}, ...this.demoRoles().map(role => ({value: String(role), label: (role)}))]; }
  private readonly APU_RETRY_KEY = 'rmc_apu_login_retry';
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspaces = inject(WorkspaceService);
  private readonly testingLoginService = inject(TestingLoginService);
  private returnRoute = '/dashboard';

  readonly currentYear = new Date().getFullYear();
  readonly showTestingLogin = this.testingLoginService.enabled;
  readonly testingAccounts = signal<TestingLoginAccount[]>([]);
  readonly demoWorkspaceFilter = signal<'RMC' | 'HR_SERVICES' | 'FINANCE'>('RMC');
  readonly demoWorkspaceOptions = [{value:'RMC',label:'RMC'},{value:'HR_SERVICES',label:'HR Services'},{value:'FINANCE',label:'Finance'}];
  readonly demoNameFilter = signal('');
  readonly demoRoleFilter = signal('');
  readonly demoRoles = computed(() =>
    [...new Set(this.testingAccounts().map(account => account.roleName))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  readonly filteredDemoUsers = computed(() => {
    const nameQuery = this.demoNameFilter().trim().toLocaleLowerCase();
    const roleQuery = this.demoRoleFilter();

    return this.testingAccounts().filter(account => {
      const matchesName =
        !nameQuery ||
        account.label.toLocaleLowerCase().includes(nameQuery) ||
        account.username.toLocaleLowerCase().includes(nameQuery);
      const matchesRole = !roleQuery || account.roleName === roleQuery;
      return matchesName && matchesRole && account.workspaceCode === this.demoWorkspaceFilter();
    });
  });
  readonly isLoading = signal(false);
  readonly loginError = signal('');

  ngOnInit(): void {
    this.loadTestingAccounts();

    const code = this.route.snapshot.queryParamMap.get('code');
    this.returnRoute = this.getReturnRoute();

    if (!code) {
      if (this.authService.isAuthenticated()) {
        this.isLoading.set(true);
        void this.navigateAfterLogin();
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
        void this.navigateAfterLogin();
      },
      error: (error: unknown) => {
        if (
          this.isExpiredOrInvalidCode(error) &&
          !sessionStorage.getItem(this.APU_RETRY_KEY)
        ) {
          sessionStorage.setItem(this.APU_RETRY_KEY, '1');
          this.authService.startApuLogin(this.returnRoute);
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
    this.authService.startApuLogin(this.returnRoute);
  }

  loginForTesting(username = 'irene.wong', workspaceCode: 'RMC' | 'HR_SERVICES' | 'FINANCE' = 'RMC'): void {
    if (workspaceCode !== 'RMC') {
      const host = new URL(environment.apiUrl).hostname;
      if (!['localhost', '127.0.0.1'].includes(host)) {
        this.loginError.set('Open the HR or Finance workspace login to use its demo accounts.');
        return;
      }
      const destination = new URL(location.origin);
      destination.port = workspaceCode === 'HR_SERVICES' ? '4201' : '4202';
      destination.pathname = '/login';
      destination.search = new URLSearchParams({demo: username}).toString();
      destination.hash = '';
      location.assign(destination.href);
      return;
    }

    this.loginError.set('');
    this.isLoading.set(true);

    this.authService.loginAsTestingUser(username).subscribe({
      next: () => {
        void this.navigateAfterLogin();
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.loginError.set(this.getErrorMessage(error));
      },
    });
  }

  private async navigateAfterLogin(): Promise<void> {
    try {
      const response = await firstValueFrom(this.workspaces.load(true));
      const choices = response.data.items;
      this.workspaces.rememberRmcRoute(this.returnRoute);
      if (!response.data.can_manage_settings && choices.length === 1) {
        const opened = await this.workspaces.open(choices[0]);
        if (opened) { this.authService.clearLoginReturnRoute(); return; }
      }
      const navigated = await this.router.navigateByUrl('/workspaces');
      if (navigated) this.authService.clearLoginReturnRoute();
      if (!navigated) {
        this.loginError.set('We could not open the requested page. Please try again.');
      }
    } catch {
      this.loginError.set('We could not open the requested page. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private loadTestingAccounts(): void {
    if (!this.showTestingLogin) {
      return;
    }

    this.testingLoginService.listAccounts().subscribe({
      next: accounts => this.testingAccounts.set(accounts),
      error: () => {
        this.isLoading.set(false);
        this.testingAccounts.set([]);
      },
    });
  }

  private getReturnRoute(): string {
    const requested = this.route.snapshot.queryParamMap.get('returnTo');
    return this.authService.getSafeReturnRoute(
      requested && requested !== '/login' ? requested : this.authService.pendingLoginReturnRoute(),
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
