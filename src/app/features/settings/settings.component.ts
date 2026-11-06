import {
  SettingsPageHeaderComponent,
  SettingsPanelComponent,
} from '../../shared/components/settings-ui/settings-ui.components';
import { StatusBadgeComponent } from '../../shared/components/form-standard/form-standard.components';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SHARED_SETTINGS_MODULES } from './settings.config';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink, SettingsPageHeaderComponent, SettingsPanelComponent, StatusBadgeComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  readonly cards = SHARED_SETTINGS_MODULES;
}
