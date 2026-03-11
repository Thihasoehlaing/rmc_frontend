import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Form field bindings
  username = '';
  password = '';

  // UI state
  loginError  = signal('');
  showPassword = signal(false);
  showDemoAccounts = signal(false);

  /** Demo accounts pulled from AuthService so they stay in sync with DUMMY_USERS. */
  readonly demoAccounts = this.authService.getDemoAccounts();

  /** Submit the login form. */
  submit(): void {
    this.loginError.set('');

    if (!this.username.trim() || !this.password) {
      this.loginError.set('Please enter your username / email and password.');
      return;
    }

    const ok = this.authService.login(this.username, this.password);
    if (ok) {
      this.router.navigate(['/dashboard']);
    } else {
      this.loginError.set(
        'Invalid username or password. Check the demo accounts panel below.'
      );
    }
  }

  /** Pre-fill the form with a demo account's credentials. */
  fillDemo(account: { username: string; password: string }): void {
    this.username = account.username;
    this.password = account.password;
    this.loginError.set('');
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleDemoAccounts(): void {
    this.showDemoAccounts.update(v => !v);
  }
}

