import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { NAVIGATION_DATA } from '../../core/constants/nav-data';
import { NavElement, NavFolder } from '../../interfaces/nav.interface';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  sidebarService = inject(SidebarService);
  isExpanded = this.sidebarService.isExpanded;
  pinned = this.sidebarService.pinned;
  navGroups = NAVIGATION_DATA;

  // Track expanded state for folders
  expandedFolders = signal<Set<string>>(new Set());

  // Track profile dropdown open state
  profileOpen = signal(false);

  user = {
    name: 'RMC_Admin',
    email: 'adelmohamad214@gmail.com',
    role: 'Administrator'
  };

  toggleProfile() {
    if (this.isExpanded()) {
      this.profileOpen.update(v => !v);
    }
  }

  toggleFolder(folder: NavFolder) {
    const label = folder.label;
    this.expandedFolders.update((set: Set<string>) => {
      const newSet = new Set(set);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  }

  isFolderExpanded(folder: NavFolder): boolean {
    return this.expandedFolders().has(folder.label) || !!folder.isExpanded;
  }

  isFolder(element: NavElement): element is NavFolder {
    return 'children' in element;
  }

  asItem(element: NavElement) {
    return element as any;
  }

  onMouseEnter() {
    this.sidebarService.setHover(true);
  }

  onMouseLeave() {
    this.sidebarService.setHover(false);
    // Close profile dropdown when mouse leaves sidebar
    this.profileOpen.set(false);
  }

  togglePin() {
    this.sidebarService.togglePin();
  }
}
