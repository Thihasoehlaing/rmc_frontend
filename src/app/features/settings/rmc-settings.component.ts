import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SETTINGS_MODULES } from './settings.config';

@Component({
  standalone: true, imports: [RouterLink],
  template: `<main class="admin-settings"><header class="settings-hero"><div class="settings-hero__content"><span class="settings-hero__eyebrow">RMC workspace</span><h1>RMC Settings</h1><p>Configure applicant eligibility and request statuses for RMC forms.</p></div></header><section class="settings-grid">@for (card of cards; track card.key) {<a [routerLink]="card.route" class="settings-card settings-card--blue"><div class="settings-card__icon"><span class="material-icons" aria-hidden="true">{{ card.icon }}</span></div><div class="settings-card__content"><h2>{{ card.title }}</h2><p>{{ card.description }}</p></div><div class="settings-card__action"><span>Open settings</span><span class="material-icons" aria-hidden="true">arrow_forward</span></div></a>}</section></main>`,
  styleUrls: ['../admin-settings/admin-settings/admin-settings.component.scss'],
})
export class RmcSettingsComponent {
  readonly cards = ['applicant-rules','request-statuses'].map(key => SETTINGS_MODULES.find(item => item.key === key)!);
}
