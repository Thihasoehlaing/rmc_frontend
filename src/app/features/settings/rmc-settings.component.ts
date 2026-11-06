import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SETTINGS_MODULES } from './settings.config';
import {
  SettingsPageHeaderComponent,
  SettingsPanelComponent,
} from '../../shared/components/settings-ui/settings-ui.components';
import { StatusBadgeComponent } from '../../shared/components/form-standard/form-standard.components';
@Component({
  standalone: true,
  imports: [RouterLink, SettingsPageHeaderComponent, SettingsPanelComponent, StatusBadgeComponent],
  templateUrl: './rmc-settings.component.html',
  styles: [':host { display: block; min-width: 0; }'],
})
export class RmcSettingsComponent {
  readonly cards = ['applicant-rules', 'request-statuses'].map(
    (key) => SETTINGS_MODULES.find((item) => item.key === key)!,
  );
}
