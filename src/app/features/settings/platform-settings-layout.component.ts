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
    this.collapsed.update((value) => !value);
    localStorage.setItem('rmc.settings.collapsed', String(this.collapsed()));
  }
  readonly groups = [
    { label: 'Access & permissions', keys: ['users', 'roles', 'groups', 'system-access'] },
    { label: 'Organization', keys: ['workspaces', 'staff-directory', 'departments'] },
    { label: 'Forms & configuration', keys: ['forms', 'dropdown-categories'] },
    { label: 'Finance setup', keys: ['account-code-categories', 'account-codes', 'vote-numbers'] },
    { label: 'Operations', keys: ['monitoring'] },
  ].map((group) => ({
    ...group,
    modules: group.keys.map((key) => SHARED_SETTINGS_MODULES.find((module) => module.key === key)!),
  }));
}
