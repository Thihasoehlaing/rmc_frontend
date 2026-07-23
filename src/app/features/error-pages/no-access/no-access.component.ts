import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './no-access.component.html',
  styleUrls: ['../shared-error-page.scss', './no-access.component.scss'],
})
export class NoAccessComponent {}
