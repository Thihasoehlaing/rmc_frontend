import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { SETTINGS_MODULES } from '../settings.config';

@Component({
  selector: 'app-settings-scope',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './settings-scope.component.html',
  styleUrl: './settings-scope.component.scss',
})
export class SettingsScopeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly scopeKey = this.route.snapshot.data['scope'] as string;

  readonly scope = computed(
    () => SETTINGS_MODULES.find(item => item.key === this.scopeKey)!,
  );
}
