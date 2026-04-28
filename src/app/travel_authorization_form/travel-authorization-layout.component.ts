import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AbacOverrideComponent } from './components/abac-override/abac-override.component';

@Component({
  selector: 'app-travel-authorization-layout',
  standalone: true,
  imports: [RouterOutlet, AbacOverrideComponent],
  template: `
    <!-- ABAC Override Testing Controls -->
    <app-abac-override></app-abac-override>

    <!-- Travel Authorization Routes -->
    <router-outlet></router-outlet>
  `,
  styleUrl: './travel-authorization-layout.component.scss'
})
export class TravelAuthorizationLayoutComponent {}
