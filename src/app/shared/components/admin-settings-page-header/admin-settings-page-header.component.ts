import { Component, Input } from '@angular/core';
import { SettingsPageHeaderComponent } from '../settings-ui/settings-ui.components';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-settings-page-header',
  standalone: true,
  imports: [RouterLink, SettingsPageHeaderComponent],
  templateUrl: './admin-settings-page-header.component.html',
  styleUrl: './admin-settings-page-header.component.scss',
})
export class AdminSettingsPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input() backRoute = '/admin-settings';
  @Input() backLabel = 'Back to Admin Settings';
}
