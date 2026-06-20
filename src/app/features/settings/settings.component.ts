import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SETTINGS_MODULES } from './settings.config';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './settings.component.html',
  styleUrls: [
    '../admin-settings/admin-settings/admin-settings.component.scss',
    './settings.component.scss',
  ],
})
export class SettingsComponent {
  readonly cards = SETTINGS_MODULES;
}
