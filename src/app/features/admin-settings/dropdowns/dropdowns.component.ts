import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { FormCacheService } from '../../../core/services/form-cache.service';
import { AdminSettingsPageHeaderComponent } from '../../../shared/components/admin-settings-page-header/admin-settings-page-header.component';

interface DropdownSection {
  id: number;
  formCode: string;
  title: string;
  description: string;
  route?: string;
  icon: string;
  categories: string[];
}

@Component({
  selector: 'app-dropdowns',
  standalone: true,
  imports: [CommonModule, AdminSettingsPageHeaderComponent],
  templateUrl: './dropdowns.component.html',
  styleUrls: ['./dropdowns.component.scss'],
})
export class DropdownsComponent implements OnInit {
  private readonly formCache = inject(FormCacheService);

  readonly loading = signal(true);

  private readonly allSections: DropdownSection[] = [
    {
      id: 1,
      formCode: 'RDIG',
      title: 'RDIG Dropdown Options',
      description: 'Maintain RDIG research clusters, organisation types, domains, ESGs, and SDGs.',
      route: '/admin-settings/dropdowns/rdig-dropdown-options',
      icon: 'science',
      categories: [
        'Research Cluster',
        'Type of Organisation',
        'Research Domain',
        'Sub-Research Domain',
        'ESG',
        'SDG',
      ],
    },
    {
      id: 2,
      formCode: 'RA_GRA',
      title: 'RA/GRA Dropdown Options',
      description: 'Maintain RA/GRA programme, supervisor, funding, and research dropdown values.',
      route: '/admin-settings/dropdowns/ra-gra-dropdown-options',
      icon: 'school',
      categories: ['Research Cluster', 'Programme Type', 'Supervisor Type', 'Funding Type'],
    },
    {
      id: 3,
      formCode: 'CONFERENCE',
      title: 'Conference Dropdown Options',
      description:
        'Maintain Conference region, vote number, account code, item, and organisation dropdown values.',
      route: '/admin-settings/dropdowns/conference-dropdown-options',
      icon: 'event',
      categories: ['Select Region', 'Vote Number', 'Account Code', 'Type of Organisation'],
    },
    {
      id: 4,
      formCode: 'JOURNAL',
      title: 'Journal Dropdown Options',
      description:
        'Maintain Journal vote number, account code, item, and organisation dropdown values.',
      route: '/admin-settings/dropdowns/journal-dropdown-options',
      icon: 'article',
      categories: ['Vote Number', 'Account Code', 'Type of Organisation'],
    },
    {
      id: 5,
      formCode: 'TRAVEL_AUTH',
      title: 'Travel Dropdown Options',
      description: 'Maintain Travel Authorisation item description dropdown values.',
      route: '/admin-settings/dropdowns/travel-dropdown-options',
      icon: 'flight_takeoff',
      categories: ['Item Description'],
    },
    {
      id: 6,
      formCode: 'PARTNERSHIP',
      title: 'Partnership Dropdown Options',
      description: 'Maintain Partnership type and category dropdown values.',
      route: '/admin-settings/dropdowns/partnership-dropdown-options',
      icon: 'handshake',
      categories: ['Partnership Type', 'Partnership Category'],
    },
  ];

  readonly sections = computed(() => {
    const activeFormCodes = this.formCache.activeFormCodes();
    return this.allSections.filter((section) => activeFormCodes.has(section.formCode));
  });

  trackById: TrackByFunction<DropdownSection> = (_index, section) => section.id;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.formCache
      .getActiveForms(true)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ error: () => undefined });
  }

  openSection(section: DropdownSection): void {
    if (!section.route) {
      return;
    }

    const queryParams = section.id === 1 ? { tab: 'RESEARCH_CLUSTER' } : undefined;

    this.router.navigate([section.route], { queryParams });
  }
}
