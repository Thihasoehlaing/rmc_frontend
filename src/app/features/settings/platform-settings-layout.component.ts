import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SHARED_SETTINGS_MODULES } from './settings.config';

@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './platform-settings-layout.component.html',
  styleUrl: './platform-settings-layout.component.scss',
})
export class PlatformSettingsLayoutComponent {
  readonly auth = inject(AuthService);
  readonly collapsed = signal(localStorage.getItem('rmc.settings.collapsed') === 'true');
  toggleSidebar(): void {
    this.collapsed.update(value => !value);
    localStorage.setItem('rmc.settings.collapsed', String(this.collapsed()));
  }
  readonly modules = SHARED_SETTINGS_MODULES;
}
