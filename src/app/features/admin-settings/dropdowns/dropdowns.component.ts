import { CommonModule } from '@angular/common';
import { Component, OnInit, TrackByFunction, signal } from '@angular/core';
import { Router } from '@angular/router';

interface DropdownSection {
  id: number;
  title: string;
  description: string;
  route?: string;
  icon: string;
  categories: string[];
}

@Component({
  selector: 'app-dropdowns',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdowns.component.html',
  styleUrls: ['./dropdowns.component.scss'],
})
export class DropdownsComponent implements OnInit {
  readonly loading = signal(true);

  readonly sections = signal<DropdownSection[]>([
    {
      id: 1,
      title: 'RDIG Application',
      description: 'Manage research cluster, organisation type, domains, ESGs, and SDGs.',
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
      title: 'RA/GRA Application',
      description: 'Manage programme, supervisor, funding, and research dropdown options.',
      route: '/admin-settings/dropdowns/ra-gra-dropdown-options',
      icon: 'school',
      categories: ['Research Cluster', 'Programme Type', 'Supervisor Type', 'Funding Type'],
    },
    {
      id: 3,
      title: 'Conference Application',
      description: 'Manage region, account, vote number, item, and organisation dropdown options.',
      route: '/admin-settings/dropdowns/conference-dropdown-options',
      icon: 'event',
      categories: [
        'Select Region',
        'Project Account Code',
        'Vote Number',
        'Item Description',
        'Type of Organisation',
      ],
    },
    {
      id: 4,
      title: 'Journal Application',
      description: 'Manage journal account, vote number, item, and organisation dropdown options.',
      route: '/admin-settings/dropdowns/journal-dropdown-options',
      icon: 'article',
      categories: [
        'Project Account Code',
        'Vote Number',
        'Account Code',
        'Item Description',
        'Type of Organisation',
      ],
    },
    {
      id: 5,
      title: 'Travel Authorisation',
      description: 'Manage travel item description dropdown options.',
      route: '/admin-settings/dropdowns/travel-dropdown-options',
      icon: 'flight_takeoff',
      categories: ['Item Description'],
    },
    {
      id: 6,
      title: 'Partnership Application',
      description: 'Manage partnership type and category dropdown options.',
      route: '/admin-settings/dropdowns/partnership-dropdown-options',
      icon: 'handshake',
      categories: ['Partnership Type', 'Partnership Category'],
    },
  ]);

  trackById: TrackByFunction<DropdownSection> = (_index, section) => section.id;

  constructor(private router: Router) {}

  ngOnInit(): void {
    setTimeout(() => this.loading.set(false), 600);
  }

  openSection(section: DropdownSection): void {
    if (!section.route) {
      return;
    }

    const queryParams = section.title === 'RDIG Application'
      ? { tab: 'RESEARCH_CLUSTER' }
      : undefined;

    this.router.navigate([section.route], { queryParams });
  }
}
