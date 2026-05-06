import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface AdminCard {
  title: string;
  description: string;
  icon: string;
  itemCount: number;
  route: string;
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss'],
})
export class AdminSettingsComponent implements OnInit {
  cards: AdminCard[] = [];

  ngOnInit(): void {
    console.log('[DEBUG] AdminSettingsComponent initialized');
    // Guidelines count: read persisted guidelines if available
    let guidelinesCount = 0;
    try {
      const stored = localStorage.getItem('rmc_guidelines_data');
      guidelinesCount = stored ? (JSON.parse(stored) as any[]).length : 0;
    } catch {
      guidelinesCount = 0;
    }

    // Dropdowns count: read persisted dropdowns if available
    let dropdownsCount = 0;
    try {
      const stored = localStorage.getItem('rmc_dropdowns_data');
      dropdownsCount = stored ? (JSON.parse(stored) as any[]).length : 0;
    } catch {
      dropdownsCount = 0;
    }

    this.cards = [
      {
        title: 'Guidelines',
        description: 'Manage instruction notes & policies displayed on each form.',
        icon: 'description',
        itemCount: guidelinesCount || 0,
        route: '/settings/guidelines',
      },
      {
        title: 'Dropdowns',
        description: 'Configure selectable options grouped by form and category.',
        icon: 'list',
        itemCount: dropdownsCount || 0,
        route: '/settings/dropdowns',
      },
      {
        title: 'Batches',
        description: 'Create, activate, or close submission batches per form.',
        icon: 'batch_prediction',
        itemCount: 0,
        route: '/settings/batches',
      },
      {
        title: 'Staff Access',
        description: 'Manage blocked staff and per-form access restrictions.',
        icon: 'person_add',
        itemCount: 0,
        route: '/settings/staff-access',
      },
    ];
  }
}
