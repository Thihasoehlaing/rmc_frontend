import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { User } from '../../core/interfaces/user.interface';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly loadError = signal('');
  readonly profile = signal<User | null>(null);
  readonly initials = computed(() =>
    (this.profile()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join(''),
  );

  ngOnInit(): void {
    this.authService.loadProfile().subscribe({
      next: user => {
        this.profile.set(user);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Your profile could not be loaded. Please try again.');
        this.isLoading.set(false);
      },
    });
  }
}
